export function generarReferenciaCobro(clienteMensualId: number): string {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dd = `${fecha.getDate()}`.padStart(2, '0');
    const aleatorio = Math.floor(100 + Math.random() * 900);
    return `MA${clienteMensualId}-${yyyy}${mm}${dd}-${aleatorio}`;
}