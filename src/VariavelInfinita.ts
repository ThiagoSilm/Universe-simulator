export class VariavelInfinita {
  private valorObservado: number | null = null;
  private observadores = 0;
  private readonly calcularValor: () => number;

  constructor(calcularValor: () => number) {
    this.calcularValor = calcularValor;
  }

  observar(): number {
    this.observadores++;
    if (this.observadores === 1 || this.valorObservado === null) {
      this.valorObservado = this.calcularValor();
    }
    return this.valorObservado;
  }

  desobservar(): void {
    this.observadores = Math.max(0, this.observadores - 1);
    if (this.observadores === 0) {
      this.valorObservado = null;
    }
  }

  get valor(): number | null {
    return this.valorObservado;
  }

  get eInfinito(): boolean {
    return this.valorObservado === null;
  }
}
