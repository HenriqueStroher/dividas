import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Aplica as migrations reais em um Postgres embutido (sem Docker) e reproduz o que
 * o Supabase oferece: os papéis anon/authenticated, auth.users e auth.uid().
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth, public to anon, authenticated;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${ALICE}'), ('${BOB}');
`;

let db: PGlite;

async function as<T>(user: string | null, work: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.sub', $1, false)`, [user ?? ""]);
  try {
    return await work();
  } finally {
    await db.exec("reset role");
  }
}

const rows = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

async function addPerson(user: string, name: string) {
  return as(user, async () => {
    const [row] = await rows<{ id: string }>("insert into people (name) values ($1) returning id", [name]);
    return row.id;
  });
}

type Share = { person_id: string; amount_cents: number };

async function createDebt(
  user: string,
  shares: Share[],
  { direction = "owed_to_me", total, self = 0, description = "Festa" }: {
    direction?: string;
    total?: number;
    self?: number;
    description?: string;
  } = {},
) {
  const totalCents = total ?? shares.reduce((sum, s) => sum + s.amount_cents, 0) + self;
  return as(user, async () => {
    const [row] = await rows<{ id: string }>(
      `select create_debt($1, $2, $3, $4, '2026-11-04', $5::jsonb) as id`,
      [direction, totalCents, self, description, JSON.stringify(shares)],
    );
    return row.id;
  });
}

async function updateDebt(user: string, debtId: string, shares: Share[], direction = "owed_to_me", self = 0) {
  const total = shares.reduce((sum, s) => sum + s.amount_cents, 0) + self;
  return as(user, () =>
    rows(`select update_debt($1, $2, $3, $4, 'Editada', '2026-11-05', $5::jsonb)`, [
      debtId,
      direction,
      total,
      self,
      JSON.stringify(shares),
    ]),
  );
}

async function markPaid(user: string, debtId: string, personId: string) {
  return as(user, () =>
    rows("update debt_shares set paid_at = now() where debt_id = $1 and person_id = $2", [debtId, personId]),
  );
}

const shareStatus = (user: string, debtId: string) =>
  as(user, () =>
    rows<{ person_id: string; amount_cents: string | number; paid_at: string | null }>(
      "select person_id, amount_cents, paid_at from debt_shares where debt_id = $1 order by position",
      [debtId],
    ),
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
});

beforeEach(async () => {
  await db.exec("reset role; truncate public.debts, public.people cascade;");
});

describe("isolamento entre usuários (RLS)", () => {
  it("um usuário não enxerga nada do outro, nem nas views", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);

    for (const table of ["people", "debts", "debt_shares", "person_balances", "debt_share_details"]) {
      await as(ALICE, async () => {
        expect(await rows(`select * from ${table}`), `dono em ${table}`).toHaveLength(1);
      });
      await as(BOB, async () => {
        expect(await rows(`select * from ${table}`), `outro usuário em ${table}`).toHaveLength(0);
      });
    }
  });

  it("um usuário não altera nem exclui registros do outro", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);

    await as(BOB, async () => {
      await rows("update people set name = 'Hackeado' where id = $1", [paulo]);
      await rows("update debts set total_cents = 1 where id = $1", [debt]);
      await rows("update debt_shares set paid_at = now() where debt_id = $1", [debt]);
      await rows("delete from debts where id = $1", [debt]);
      await rows("delete from people where id = $1", [paulo]);
    });

    const [person] = await rows<{ name: string }>("select name from people where id = $1", [paulo]);
    const [row] = await rows<{ total_cents: number }>("select total_cents from debts where id = $1", [debt]);
    expect(person.name).toBe("Paulo");
    expect(Number(row.total_cents)).toBe(5000);
    expect((await shareStatus(ALICE, debt))[0].paid_at).toBeNull();
  });

  it("não permite gravar com o user_id de outra pessoa", async () => {
    await expect(
      as(BOB, () => rows("insert into people (user_id, name) values ($1, 'Intruso')", [ALICE])),
    ).rejects.toThrow(/row-level security/);
  });

  it("não permite criar dívida apontando para a pessoa de outro usuário", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await expect(createDebt(BOB, [{ person_id: paulo, amount_cents: 5000 }])).rejects.toThrow(/foreign key/);
    await as(BOB, async () => expect(await rows("select * from debts")).toHaveLength(0));
  });

  it("não permite editar a dívida de outro usuário pela função", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    await expect(updateDebt(BOB, debt, [{ person_id: paulo, amount_cents: 1 }])).rejects.toThrow(/não encontrada/);
  });

  it("visitante sem login não acessa tabelas, views nem funções", async () => {
    for (const table of ["people", "debts", "debt_shares", "person_balances", "debt_share_details"]) {
      await expect(as(null, () => rows(`select * from ${table}`)), table).rejects.toThrow(/permission denied/);
    }
    await expect(as(null, () => rows(`select create_debt('i_owe', 1, 0, 'x', '2026-11-04', '[]'::jsonb)`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("create_debt", () => {
  it("recusa partes que não somam o total e não grava nada", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await expect(createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }], { total: 9000 })).rejects.toThrow(
      /soma das partes/,
    );
    await as(ALICE, async () => expect(await rows("select * from debts")).toHaveLength(0));
  });

  it("desfaz tudo se uma parte falhar", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await expect(
      createDebt(ALICE, [
        { person_id: paulo, amount_cents: 5000 },
        { person_id: paulo, amount_cents: 5000 },
      ]),
    ).rejects.toThrow(/unique/);
    await as(ALICE, async () => expect(await rows("select * from debts")).toHaveLength(0));
  });

  it("recusa dívida sem pessoas", async () => {
    await expect(createDebt(ALICE, [], { total: 100, self: 100 })).rejects.toThrow(/ao menos uma pessoa/);
  });

  it("conta a parte do próprio usuário no total, mas não como dívida", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }], { self: 5000 });
    await as(ALICE, async () => {
      const [balance] = await rows<{ net_cents: number }>("select net_cents from person_balances");
      const [debt] = await rows<{ total_cents: number; self_share_cents: number }>("select * from debts");
      expect(Number(balance.net_cents)).toBe(5000);
      expect(Number(debt.total_cents)).toBe(10000);
      expect(Number(debt.self_share_cents)).toBe(5000);
    });
  });
});

describe("update_debt", () => {
  it("mantém paga a parte cujo valor não mudou", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const joao = await addPerson(ALICE, "João");
    const debt = await createDebt(ALICE, [
      { person_id: paulo, amount_cents: 5000 },
      { person_id: joao, amount_cents: 5000 },
    ]);
    await markPaid(ALICE, debt, paulo);

    await updateDebt(ALICE, debt, [
      { person_id: paulo, amount_cents: 5000 },
      { person_id: joao, amount_cents: 7000 },
    ]);

    const [p, j] = await shareStatus(ALICE, debt);
    expect(p.paid_at).not.toBeNull();
    expect(j.paid_at).toBeNull();
    expect(Number(j.amount_cents)).toBe(7000);
  });

  it("volta a pendente a parte paga cujo valor mudou", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    await markPaid(ALICE, debt, paulo);

    await updateDebt(ALICE, debt, [{ person_id: paulo, amount_cents: 6000 }]);
    expect((await shareStatus(ALICE, debt))[0].paid_at).toBeNull();
  });

  it("volta a pendente quando o sentido da dívida muda", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    await markPaid(ALICE, debt, paulo);

    await updateDebt(ALICE, debt, [{ person_id: paulo, amount_cents: 5000 }], "i_owe");
    expect((await shareStatus(ALICE, debt))[0].paid_at).toBeNull();
  });

  it("remove quem saiu da dívida e adiciona quem entrou", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const joao = await addPerson(ALICE, "João");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);

    await updateDebt(ALICE, debt, [{ person_id: joao, amount_cents: 5000 }]);

    const shares = await shareStatus(ALICE, debt);
    expect(shares.map((s) => s.person_id)).toEqual([joao]);
  });

  it("não deixa a edição inválida pela metade", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    const invalid = [{ person_id: "00000000-0000-0000-0000-000000000999", amount_cents: 5000 }];

    await expect(updateDebt(ALICE, debt, invalid)).rejects.toThrow(/foreign key/);

    const shares = await shareStatus(ALICE, debt);
    expect(shares.map((s) => s.person_id)).toEqual([paulo]);
  });
});

describe("person_balances", () => {
  it("calcula o saldo líquido e ignora o que já foi pago", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 3000 }], { description: "Restaurante" });
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }], { description: "Festa" });
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 2000 }], { description: "Bebida" });
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 3000 }], { direction: "i_owe", description: "Uber" });
    const paid = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 9900 }], { description: "Quitada" });
    await markPaid(ALICE, paid, paulo);

    await as(ALICE, async () => {
      const [balance] = await rows<Record<string, number>>("select * from person_balances where person_id = $1", [paulo]);
      expect(Number(balance.receivable_cents)).toBe(10000);
      expect(Number(balance.payable_cents)).toBe(3000);
      expect(Number(balance.net_cents)).toBe(7000);
    });
  });

  it("mostra saldo zero para pessoa sem pendências", async () => {
    await addPerson(ALICE, "Paulo");
    await as(ALICE, async () => {
      const [balance] = await rows<{ net_cents: number }>("select net_cents from person_balances");
      expect(Number(balance.net_cents)).toBe(0);
    });
  });
});

describe("regras das tabelas", () => {
  it("não aceita nomes repetidos na mesma conta, ignorando maiúsculas", async () => {
    await addPerson(ALICE, "Paulo");
    await expect(addPerson(ALICE, " paulo ")).rejects.toThrow(/unique/);
  });

  it("permite o mesmo nome em contas diferentes", async () => {
    await addPerson(ALICE, "Paulo");
    await expect(addPerson(BOB, "Paulo")).resolves.toBeTruthy();
  });

  it("excluir a dívida remove as partes", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    const debt = await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    await as(ALICE, () => rows("delete from debts where id = $1", [debt]));
    await as(ALICE, async () => expect(await rows("select * from debt_shares")).toHaveLength(0));
  });

  it("não exclui pessoa que tem dívidas", async () => {
    const paulo = await addPerson(ALICE, "Paulo");
    await createDebt(ALICE, [{ person_id: paulo, amount_cents: 5000 }]);
    await expect(as(ALICE, () => rows("delete from people where id = $1", [paulo]))).rejects.toThrow(/foreign key/);
  });
});
