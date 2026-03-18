import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiXMark, HiMagnifyingGlass, HiMapPin } from 'react-icons/hi2'

const StackedGallery = ({ properties }) => {
  const images = properties.map(p => p.image_url).filter(Boolean).slice(0, 3)
  const remaining = properties.length - 1

  return (
    <div className="relative w-full max-w-[320px] aspect-[4/3] mb-6 mt-4">
      {/* Back Layer 2 */}
      {images[2] && (
        <motion.div 
          initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
          animate={{ opacity: 1, rotate: -8, scale: 0.9 }}
          className="absolute inset-0 rounded-2xl overflow-hidden grayscale opacity-40 border border-white/10"
          style={{ zIndex: 1, originX: 0.5, originY: 0.5, x: -20, y: -10 }}
        >
          <img src={images[2]} alt="" className="w-full h-full object-cover" />
        </motion.div>
      )}

      {/* Back Layer 1 */}
      {images[1] && (
        <motion.div 
          initial={{ opacity: 0, rotate: 6, scale: 0.95 }}
          animate={{ opacity: 1, rotate: 6, scale: 0.95 }}
          className="absolute inset-0 rounded-2xl overflow-hidden grayscale opacity-70 border border-white/10 shadow-xl"
          style={{ zIndex: 2, originX: 0.5, originY: 0.5, x: 15, y: -5 }}
        >
          <img src={images[1]} alt="" className="w-full h-full object-cover" />
        </motion.div>
      )}

      {/* Front Image */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
        style={{ zIndex: 10 }}
      >
        <img src={images[0] || 'https://via.placeholder.com/400x300?text=Premium+Listing'} alt="" className="w-full h-full object-cover" />
        
        {/* Badge */}
        {remaining > 0 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-bold text-white tracking-wider">
            +{remaining} MORE
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </motion.div>
    </div>
  )
}

const PropertyGridCard = ({ property }) => {
  const formatPrice = (price) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`
    if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
    return `$${price.toLocaleString()}`
  }

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 flex flex-col group cursor-pointer"
    >
      <div className="aspect-[16/10] overflow-hidden relative">
        <img 
          src={property.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt={property.address}
        />
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white">
          {property.status?.toUpperCase() || 'ACTIVE'}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <span className="text-xl font-bold text-white tracking-tight">{formatPrice(property.price)}</span>
        </div>
        <div className="text-[13px] text-white/90 font-medium truncate">{property.address}</div>
        <div className="flex items-center gap-1 text-[11px] text-white/50">
          <HiMapPin size={12} />
          {property.city}{property.state ? `, ${property.state}` : ''}
        </div>
      </div>
    </motion.div>
  )
}

const PropertyResults = ({ properties, locationHint = 'your search area' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!properties || properties.length === 0) return null

  // If 2 or fewer, the user might want them normally, but the request says:
  // "whenever more than 2 properties are found" use summary.
  // So for 1 or 2, we return null and let individual cards handle it?
  // Actually, it's better if this component handles the "Summary View" ONLY if > 2.
  if (properties.length <= 2) return null

  return (
    <div className="my-6">
      <StackedGallery properties={properties} />
      
      <div className="mt-4 mb-2">
        <p className="text-[17px] font-light text-white/90 leading-relaxed mb-4">
          I found <span className="font-bold text-white">{properties.length} properties</span> matching your criteria in <span className="font-semibold text-white">{locationHint}</span>.
        </p>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-full bg-white text-black font-bold text-[13px] tracking-tight hover:bg-white/90 transition-all flex items-center gap-2"
        >
          <HiMagnifyingGlass strokeWidth={2.5} size={16} />
          VIEW ALL MATCHES
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xl flex flex-col items-center p-6 md:p-12 overflow-hidden"
          >
            {/* Header */}
            <div className="w-full max-w-6xl flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Found Matches</h2>
                <p className="text-white/50 text-[14px] uppercase tracking-widest font-bold">Bangna Estate Selection</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <HiXMark size={24} />
              </button>
            </div>

            {/* Scroll Area */}
            <div className="w-full max-w-6xl flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {properties.map((prop, idx) => (
                  <motion.div
                    key={prop.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <PropertyGridCard property={prop} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PropertyResults
