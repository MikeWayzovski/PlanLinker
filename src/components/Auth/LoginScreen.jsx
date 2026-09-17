import React from 'react';
import ModusIcon from '../Modus/ModusIcon';

const LoginScreen = ({ isLoading, isCallback, isConfigured, error, onLogin }) => {
  const title = isCallback ? 'Signing in' : isLoading ? 'Checking your session' : 'Sign in to Plan Linker';
  const body = isCallback
    ? 'Finishing Trimble ID sign-in. This only takes a moment.'
    : isLoading
      ? 'Looking for an existing Trimble ID session.'
      : 'Open overview drawings, click a detail code, and hop to the matching sheet in this project.';

  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 bg-body-secondary p-3">
      <div className="card shadow-sm border-0 login-card">
        <div className="card-body p-4 text-center">
          <ModusIcon name="file-pdf" size="48px" extraClasses="text-primary mb-3" />
          <h1 className="h4 fw-bold mb-1">{title}</h1>
          <p className="text-muted mb-4">{body}</p>

          {error ? (
            <div className="alert alert-danger text-start small" role="alert">
              Sign-in failed: {error}
            </div>
          ) : null}

          {!isConfigured && !isLoading ? (
            <div className="alert alert-warning text-start small" role="alert">
              Trimble ID is not configured for this deployment. Inside Trimble Connect the
              extension still works with the Workspace token.
            </div>
          ) : null}

          {isLoading || isCallback ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={onLogin}
              disabled={!isConfigured}
            >
              <ModusIcon name="person" size="18px" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
};

export default LoginScreen;
