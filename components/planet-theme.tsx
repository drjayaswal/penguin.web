'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Planet = 'earth' | 'mars'

interface PlanetContextType {
  planet: Planet
  setPlanet: (planet: Planet) => void
  togglePlanet: () => void
}

const PlanetContext = createContext<PlanetContextType>({
  planet: 'mars',
  setPlanet: () => { },
  togglePlanet: () => { },
})

export function usePlanet() {
  return useContext(PlanetContext)
}

export function PlanetProvider({ children }: { children: ReactNode }) {
  const [planet, setPlanetState] = useState<Planet>('mars')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('penguin_planet') as Planet | null
      if (saved === 'earth' || saved === 'mars') {
        setPlanetState(saved)
      }
    } catch { }
  }, [])

  function setPlanet(p: Planet) {
    setPlanetState(p)
    try {
      localStorage.setItem('penguin_planet', p)
    } catch { }
  }

  function togglePlanet() {
    setPlanet(planet === 'mars' ? 'earth' : 'mars')
  }

  return (
    <PlanetContext.Provider value={{ planet, setPlanet, togglePlanet }}>
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 bg-cover bg-top bg-no-repeat pointer-events-none transition-opacity duration-700 ease-in-out ${planet === 'mars' ? 'opacity-100' : 'opacity-0'
          }`}
        style={{ backgroundImage: "url('/planets/Mars.webp')" }}
      />
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 bg-cover bg-top bg-no-repeat pointer-events-none transition-opacity duration-700 ease-in-out ${planet === 'earth' ? 'opacity-100' : 'opacity-0'
          }`}
        style={{ backgroundImage: "url('/planets/Earth.webp')" }}
      />
      {children}
    </PlanetContext.Provider>
  )
}

export function PlanetToggle() {
  const { planet, setPlanet } = usePlanet()

  const options: { id: Planet; label: string; src: string }[] = [
    { id: 'earth', label: 'Earth', src: '/planets/earth.png' },
    { id: 'mars', label: 'Mars', src: '/planets/mars.png' },
  ]

  return (
    <div
      role="group"
      aria-label="Planet background selection"
      className="inline-flex items-center gap-2 p-1.5 rounded-full bg-white/5 backdrop-blur-sm select-none"
    >
      {options.map((opt) => {
        const active = planet === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPlanet(opt.id)}
            aria-pressed={active}
            aria-label={`Show ${opt.label} background`}
            title={opt.label}
            className={`relative h-9 w-9 shrink-0 rounded-full overflow-hidden cursor-pointer transition-all duration-200 ${active
              ? 'scale-120 opacity-100'
              : 'opacity-50 hover:opacity-100'
              }`}
          >
            <img
              src={opt.src}
              alt=""
              draggable={false}
              className="h-full w-full object-cover pointer-events-none"
            />
          </button>
        )
      })}
    </div>
  )
}