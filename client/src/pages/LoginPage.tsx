import { useState } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        setLocation("/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      background: '#f3f0ff', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Login to PlateMate</h2>
        
        <form onSubmit={handleLogin}>
          <input
            data-testid="input-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '90%',
              padding: '10px',
              margin: '8px 0',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '14px'
            }}
          />
          <br />
          
          <input
            data-testid="input-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '90%',
              padding: '10px',
              margin: '8px 0',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '14px'
            }}
          />
          <br />
          
          {error && (
            <div data-testid="text-error" style={{ 
              color: 'red', 
              fontSize: '14px', 
              marginTop: '10px',
              marginBottom: '10px' 
            }}>
              {error}
            </div>
          )}
          
          <button
            data-testid="button-login"
            type="submit"
            disabled={isLoading}
            style={{
              width: '90%',
              padding: '10px',
              margin: '8px 0',
              borderRadius: '8px',
              border: 'none',
              background: isLoading ? '#999' : 'purple',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: '0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#5a007a';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'purple';
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          No account?{' '}
          <a
            data-testid="link-register"
            href="/register"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/register");
            }}
            style={{
              color: 'purple',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
