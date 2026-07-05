import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import supabase from './supabaseClient'

function App() {
  const [count, setCount] = useState(0)
  const [currentPage, setCurrentPage] = useState('home')
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Retrieve current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setCurrentPage('dashboard')
      }
    })

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setCurrentPage('dashboard')
      } else {
        setCurrentPage('home')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const renderContent = () => {
    switch (currentPage) {
      case 'signup':
        return <Signup />
      case 'login':
        return <Login onLoginSuccess={(sess) => {
          setSession(sess)
          setCurrentPage('dashboard')
        }} />
      case 'dashboard':
        return <Dashboard session={session} />
      case 'contacts':
        return <Contacts />
      case 'home':
      default:
        return (
          <>
            <section id="center">
              <div className="hero">
                <img src={heroImg} className="base" width="170" height="179" alt="" />
                <img src={reactLogo} className="framework" alt="React logo" />
                <img src={viteLogo} className="vite" alt="Vite logo" />
              </div>
              <div>
                <h1>Get started</h1>
                <p>
                  Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
                </p>
              </div>
              <button
                type="button"
                className="counter"
                onClick={() => setCount((count) => count + 1)}
              >
                Count is {count}
              </button>
            </section>

            <div className="ticks"></div>

            <section id="next-steps">
              <div id="docs">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#documentation-icon"></use>
                </svg>
                <h2>Documentation</h2>
                <p>Your questions, answered</p>
                <ul>
                  <li>
                    <a href="https://vite.dev/" target="_blank">
                      <img className="logo" src={viteLogo} alt="" />
                      Explore Vite
                    </a>
                  </li>
                  <li>
                    <a href="https://react.dev/" target="_blank">
                      <img className="button-icon" src={reactLogo} alt="" />
                      Learn more
                    </a>
                  </li>
                </ul>
              </div>
              <div id="social">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#social-icon"></use>
                </svg>
                <h2>Connect with us</h2>
                <p>Join the Vite community</p>
                <ul>
                  <li>
                    <a href="https://github.com/vitejs/vite" target="_blank">
                      <svg
                        className="button-icon"
                        role="presentation"
                        aria-hidden="true"
                      >
                        <use href="/icons.svg#github-icon"></use>
                      </svg>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://chat.vite.dev/" target="_blank">
                      <svg
                        className="button-icon"
                        role="presentation"
                        aria-hidden="true"
                      >
                        <use href="/icons.svg#discord-icon"></use>
                      </svg>
                      Discord
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/vite_js" target="_blank">
                      <svg
                        className="button-icon"
                        role="presentation"
                        aria-hidden="true"
                      >
                        <use href="/icons.svg#x-icon"></use>
                      </svg>
                      X.com
                    </a>
                  </li>
                  <li>
                    <a href="https://bsky.app/profile/vite.dev" target="_blank">
                      <svg
                        className="button-icon"
                        role="presentation"
                        aria-hidden="true"
                      >
                        <use href="/icons.svg#bluesky-icon"></use>
                      </svg>
                      Bluesky
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <div className="ticks"></div>
            <section id="spacer"></section>
          </>
        )
    }
  }

  return (
    <>
      <header className="nav-bar">
        <div className="nav-logo">SafeHer</div>
        <nav className="nav-links">
          <button 
            type="button" 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          {session ? (
            <>
              <button 
                type="button" 
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                Dashboard
              </button>
              <button 
                type="button" 
                className={`nav-link ${currentPage === 'contacts' ? 'active' : ''}`}
                onClick={() => setCurrentPage('contacts')}
              >
                Safety Circle
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className={`nav-link ${currentPage === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentPage('login')}
              >
                Log In
              </button>
              <button 
                type="button" 
                className={`nav-link ${currentPage === 'signup' ? 'active' : ''}`}
                onClick={() => setCurrentPage('signup')}
              >
                Sign Up
              </button>
            </>
          )}
        </nav>
      </header>

      {currentPage === 'home' ? renderContent() : (
        <section id="center">
          {renderContent()}
        </section>
      )}
    </>
  )
}

export default App



