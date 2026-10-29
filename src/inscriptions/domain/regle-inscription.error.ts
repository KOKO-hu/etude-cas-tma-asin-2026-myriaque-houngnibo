export class RegleInscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegleInscriptionError';
  }
}
