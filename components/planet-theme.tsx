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
  const { planet, togglePlanet } = usePlanet()
  const nextPlanet = planet === 'mars' ? 'earth' : 'mars'
  const nextLabel = nextPlanet === 'earth' ? 'Earth' : 'Mars'
  const nextSrc = nextPlanet === 'earth' ? '/planets/earth.png' : '/planets/mars.png'

  return (
    <button
      type="button"
      onClick={togglePlanet}
      aria-label={`Switch to ${nextLabel} background`}
      title={`Switch to ${nextLabel}`}
      className="group relative h-9 w-9 cursor-pointer overflow-hidden"
    >
      <img
        key={nextPlanet}
        src={nextSrc}
        alt={nextLabel}
        draggable={false}
        className="h-full w-full object-contain pointer-events-none transition-all duration-500 ease-out group-hover:scale-110 group-active:scale-95 animate-in fade-in zoom-in-75"
      />
    </button>
  )
}