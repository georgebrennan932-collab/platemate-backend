import { useState } from "react";
import { useLocation } from "wouter";
import { buildApiUrl } from '@/lib/api-config';

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(buildApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim(),
          securityAnswer: securityAnswer.trim()
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Account created successfully! Please log in.");
        setLocation("/login");
      } else {
        setError(data.error || "Registration failed");
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
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Create a PlateMate Account</h2>
        
        <form onSubmit={handleRegister}>
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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
          
          <div style={{ 
            textAlign: 'left', 
            width: '90%', 
            margin: '15px auto 5px', 
            fontSize: '13px', 
            color: '#555',
            fontWeight: '500'
          }}>
            Security Question: What is your favorite food?
          </div>
          
          <input
            data-testid="input-security-answer"
            type="text"
            placeholder="Your answer (for password reset)"
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
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
            data-testid="button-register"
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
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <a
            data-testid="link-login"
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/login");
            }}
            style={{
              color: 'purple',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
