import { createContext, useContext, useEffect, useState } from 'react'

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
  const [activeLocation, setActiveLocation] = useState(() => localStorage.getItem('medata-location') || 'uks')

  useEffect(() => localStorage.setItem('medata-location', activeLocation), [activeLocation])
  return <LocationContext.Provider value={{ activeLocation, setActiveLocation, currentLocation: activeLocation, setCurrentLocation: setActiveLocation }}>{children}</LocationContext.Provider>
}

export const useLocationContext = () => useContext(LocationContext)
