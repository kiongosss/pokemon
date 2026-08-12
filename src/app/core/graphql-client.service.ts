import { Injectable } from '@angular/core';
import { defer, from, Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

export interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class GraphqlRequestError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly originalError: unknown,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class GraphqlClientService {
  private async execute<T>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as GraphqlResponse<T>;

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.map((error) => error.message).join('; '));
    }

    if (result.data === undefined) {
      throw new Error('GraphQL response did not contain data.');
    }

    return result.data;
  }

  /**
   * Executes a GraphQL query without retry logic.
   * Use this for the local mock server and for mutations.
   */
  query$<T>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Observable<T> {
    return defer(() => from(this.execute<T>(url, query, variables))).pipe(
      catchError((error: unknown) => throwError(() => this.toGraphqlRequestError(error))),
    );
  }

  /**
   * Executes a GraphQL query with PokeAPI-specific retry.
   */
  pokeapiQuery$<T>(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Observable<T> {
    return defer(() => from(this.execute<T>(url, query, variables))).pipe(
      retry({ count: 2, delay: 500 }), // 2 retries with 500ms delay for flaky public API
      catchError((error: unknown) => throwError(() => this.toGraphqlRequestError(error))),
    );
  }

  private toGraphqlRequestError(error: unknown): GraphqlRequestError {
    const message = error instanceof Error ? error.message : 'Unknown GraphQL error';
    return new GraphqlRequestError(message, `Request failed: ${message}`, error);
  }
}
