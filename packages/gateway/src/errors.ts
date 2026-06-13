import type { LLMResponse } from "@zazaphi/contracts";

/**
 * Raised when the gateway cannot produce schema-valid output. Carries an
 * LLMResponse with finish_reason "error" so callers can record the failed
 * attempt without ever receiving unvalidated content.
 */
export class GatewayError extends Error {
  readonly response: LLMResponse;

  constructor(message: string, response: LLMResponse) {
    super(message);
    this.name = "GatewayError";
    this.response = response;
  }
}
