import React, { useState, useEffect } from 'react'

export default function TitleBar({ theme = 'dark' }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api?.windowIsMaximized().then(setIsMaximized)
  }, [])

  const isDark = theme === 'dark'

  return (
    <div
      className="titlebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 32,
        paddingRight: 8,
        WebkitAppRegion: 'drag',
        flexShrink: 0,
        background: 'transparent'
      }}
    >
      <div
        style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}
      >
        <TitleBtn
          onClick={() => window.api?.windowMinimize()}
          color="#f0a500"
          title="Minimizar"
          icon="—"
        />
        <TitleBtn
          onClick={() => {
            window.api?.windowMaximize()
            setIsMaximized((v) => !v)
          }}
          color="#28c840"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          icon={isMaximized ? '⊡' : '□'}
        />
        <TitleBtn
          onClick={() => window.api?.windowClose()}
          color="#ff5f57"
          title="Fechar"
          icon="×"
        />
      </div>
    </div>
  )
}

function TitleBtn({ onClick, color, title, icon }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: 'none',
        background: color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        color: hover ? 'rgba(0,0,0,0.7)' : 'transparent',
        transition: 'color 0.15s',
        padding: 0,
        lineHeight: 1
      }}
    >
      {icon}
    </button>
  )
}
