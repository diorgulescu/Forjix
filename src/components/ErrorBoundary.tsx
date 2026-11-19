// SPDX-License-Identifier: GPL-3.0-or-later

import React from 'react';

interface ErrorBoundaryProps {
  /** Label shown in the fallback UI so the user knows which pane failed. */
  name: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Catches render errors in a subtree and shows a kid-friendly fallback
 * instead of blanking the entire application.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[ErrorBoundary:${this.props.name}]`,
      error,
      info.componentStack
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" data-testid={`error-boundary-${this.props.name}`}>
          <div className="error-boundary-icon" aria-hidden="true">⚠️</div>
          <h3 className="error-boundary-title">
            {this.props.name} — Something went wrong
          </h3>
          <p className="error-boundary-message">{this.state.errorMessage}</p>
          <button
            type="button"
            className="error-boundary-reset-btn"
            onClick={this.handleReset}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
