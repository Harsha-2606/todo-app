import React from 'react';

interface LoginProps {
  handleGoogleSignIn: () => void;
}

const Login: React.FC<LoginProps> = ({ handleGoogleSignIn }) => {
  return (
    <div className="logincontainer">
      <div className="logindetails">
        <div className="loginlogo">
          <img src="/images/todoist image.png" alt="Todoist Logo" />
        </div>
        <div className="login">
          <h1>Log in</h1>
          <div className="loginbutton" onClick={handleGoogleSignIn}>
            <img src="/images/google logo.png" alt="Google Logo" />
            <button>Continue with Google</button>
          </div>
        </div>
      </div>
      <div className="terms-policy">
        <p>
          By continuing with Google, you agree to Todoist's{' '}
          <a href="https://doist.com/terms-of-service" target="_blank" rel="noreferrer noopener" >
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="https://doist.com/privacy" target="_blank" rel="noreferrer noopener">
            Privacy Policy
          </a>
        </p>
      </div>
      <div className="loginimage">
        <img src="/images/background-image.png" alt="Background" />
      </div>
    </div>
  );
};

export default Login;