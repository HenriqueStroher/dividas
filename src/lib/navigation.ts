/**
 * Diz se o item da barra inferior corresponde à página atual. A página da pessoa faz parte
 * de Saldos. A página de uma dívida pode ser aberta pelas duas abas, então não marca nenhuma.
 */
export function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/pessoas/");
  return pathname === href;
}
