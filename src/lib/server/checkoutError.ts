export class CheckoutValidationError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "CheckoutValidationError";
		this.status = status;
	}
}
