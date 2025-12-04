import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Vite + React + Tailwind</h1>
        <p className="text-gray-600 mb-6">
          Tailwind CSS is now configured and ready to use.
        </p>
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
        >
          Count is {count}
        </button>
        <p className="mt-4 text-sm text-gray-500">
          Edit <code className="bg-gray-200 px-1 rounded">src/App.tsx</code> to start building.
        </p>
      </div>
    </div>
  )
}

export default App
