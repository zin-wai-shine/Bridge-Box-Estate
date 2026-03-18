import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiX, HiChevronRight, HiLocationMarker } from 'react-icons/hi'

const PropertyResults = ({ properties, locationHint = 'your search area' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  if (!properties || properties.length === 0) return null
  
  const images = properties.map(p => p.image_url).filter(Boolean).slice(0, 3)
  const remainingCount = properties.length - 1

  return (
    <div className="my-8 flex flex-col items-start font-sans">
      {/* Layered Stack Visual */}
      <motion.div 
        className="relative h-64 w-full max-w-[340px] cursor-pointer"
        whileHover={{ scale: 1.02 }}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Back Image (3rd) */}
        {images[2] && (
          <div 
            className="absolute inset-0 rounded-2xl border border-neutral-100 shadow-sm overflow-hidden"
            style={{ 
              transform: 'translateX(8px) rotate(4deg) scale(0.9)',
              zIndex: 1,
              background: '#f8f9fa'
            }}
          >
            <img src={images[2]} className="w-full h-full object-cover opacity-40 grayscale" alt="" />
          </div>
        )}

        {/* Middle Image (2nd) */}
        {images[1] && (
          <div 
            className="absolute inset-0 rounded-2xl border border-neutral-100 shadow-sm overflow-hidden"
            style={{ 
              transform: 'translateX(4px) rotate(2deg) scale(0.95)',
              zIndex: 2,
              background: '#f8f9fa'
            }}
          >
            <img src={images[1]} className="w-full h-full object-cover opacity-70" alt="" />
          </div>
        )}

        {/* Front Image (1st) */}
        <div 
          className="absolute inset-0 rounded-2xl border border-neutral-100 shadow-xl overflow-hidden"
          style={{ zIndex: 10, background: 'white' }}
        >
          <img src={images[0] || 'https://via.placeholder.com/400x300?text=Premium+Listing'} className="w-full h-full object-cover" alt="" />
          
          {/* Badge */}
          {remainingCount > 0 && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-md border border-neutral-100 rounded-full shadow-sm">
              <span className="text-[11px] font-bold text-neutral-900 tracking-tight">+{remainingCount} MORE</span>
            </div>
          )}
          
          {/* Subtle info overlay */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
             <div className="text-white text-xs font-medium uppercase tracking-widest opacity-80">Top Selection</div>
          </div>
        </div>
      </motion.div>

      {/* Summary Text */}
      <div className="mt-6 flex flex-col gap-1 items-start">
        <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
          Estate Selection: {locationHint}
        </h3>
        <p className="text-sm text-neutral-500 font-medium">
          I've identified {properties.length} luxury properties matching your criteria.
        </p>
      </div>

      {/* View All Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="mt-6 px-6 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-full text-xs font-bold tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-neutral-200"
      >
        VIEW ALL MATCHES
        <HiChevronRight size={14} />
      </button>

      {/* Modal View */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-neutral-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Property Matches</h2>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Found in {locationHint}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-900 transition-colors"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Scrollable Grid */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                  {properties.map((prop, idx) => (
                    <motion.div 
                      key={prop.id || idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group cursor-pointer"
                    >
                      <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-neutral-100 shadow-sm relative mb-4">
                        <img 
                          src={prop.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          alt="" 
                        />
                        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg border border-neutral-100 text-[10px] font-bold text-neutral-900 uppercase">
                          {prop.status || 'Active'}
                        </div>
                      </div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-lg font-bold text-neutral-900 tracking-tight">
                          ${(prop.price || 0).toLocaleString()}
                        </h4>
                      </div>
                      <div className="text-sm text-neutral-900 font-medium truncate mb-1">{prop.address}</div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-bold uppercase tracking-wide">
                        <HiLocationMarker size={12} className="text-neutral-400" />
                        {prop.city}{prop.state ? `, ${prop.state}` : ''}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PropertyResults
