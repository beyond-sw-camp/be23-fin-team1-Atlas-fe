declare module 'jsvectormap' {
  const jsVectorMap: new (options: Record<string, unknown>) => {
    destroy?: () => void
  }

  export default jsVectorMap
}

declare module 'jsvectormap/dist/maps/world.js'
declare module 'jsvectormap/dist/maps/world-merc.js'
