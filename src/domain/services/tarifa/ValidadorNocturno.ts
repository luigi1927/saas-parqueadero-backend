export class ValidadorNocturno {
    static aplica(
        fechaEntrada: Date | string,
        fechaSalida: Date | string,
        horaInicioNocturna: string,
        horaFinNocturna: string,
        minutosTotales: number
    ): boolean {
        const entrada = new Date(fechaEntrada);
        const salida = new Date(fechaSalida);

        const horaEntradaStr = entrada.toTimeString().substring(0, 8);
        const horaSalidaStr = salida.toTimeString().substring(0, 8);

        const cruzaHorario = horaEntradaStr >= horaInicioNocturna || horaSalidaStr <= horaFinNocturna;
        const esPernoctaProlongada = minutosTotales >= 720;

        return cruzaHorario || esPernoctaProlongada;
    }
}