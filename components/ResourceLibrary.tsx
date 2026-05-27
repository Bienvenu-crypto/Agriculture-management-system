import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

const resources = [
  {
    title: 'Modern Maize Farming Techniques',
    type: 'Video',
    source: 'NARO Uganda',
    content: 'https://www.youtube.com/embed/tgbNymZ7vqY',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Coffee Wilt Disease Management',
    type: 'Guide',
    source: 'Uganda Coffee Development Authority',
    content: `
### Understanding Coffee Wilt Disease

Coffee wilt disease (CWD) is a severe vascular wilt disease of coffee caused by the fungus *Fusarium xylarioides*. It primarily affects Robusta coffee in Uganda.

#### Key Symptoms:
*   Yellowing and curling of leaves
*   Premature leaf fall
*   Blackening of the vascular system under the bark
*   Eventual death of the entire coffee tree

#### Management Strategies:
1.  **Uproot and Burn:** Immediately uproot and burn infected trees on the spot to prevent the fungus from spreading.
2.  **Tool Disinfection:** Always disinfect pruning tools (e.g., with bleach or fire) after working on an infected tree before moving to a healthy one.
3.  **Resistant Varieties:** Plant CWD-resistant Robusta varieties provided by NARO/UCDA.
4.  **Avoid Movement:** Do not move infected coffee wood or soil from infected areas to healthy farms.
    `,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Soil Conservation Practices',
    type: 'Article',
    source: 'Ministry of Agriculture',
    content: `
### Key Soil Conservation Techniques for Smallholders

Healthy soil is the foundation of a good harvest. Here are practical ways to protect your soil from erosion and nutrient loss:

#### 1. Crop Rotation
Changing the type of crops grown in a specific area each season helps prevent the depletion of specific nutrients and breaks pest cycles. For example, alternate maize (heavy feeder) with beans (nitrogen fixer).

#### 2. Cover Crops
Planting crops like mucuna or lablab to cover the soil rather than for the purpose of being harvested. They protect the soil from heavy rain and add organic matter when they decompose.

#### 3. Terracing and Trenches
Creating step-like flat areas or digging trenches (Fanya Juu/Fanya Chini) on sloping land to reduce water runoff and soil erosion during heavy rains.

#### 4. Mulching
Applying a layer of dry grass, banana leaves, or other organic material to the surface of the soil. This retains moisture during dry spells, suppresses weeds, and adds nutrients as it rots.
    `,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    title: 'Drip Irrigation Setup for Smallholders',
    type: 'Video',
    source: 'AgriTech Hub',
    content: 'https://www.youtube.com/embed/tgbNymZ7vqY',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
];

export default function ResourceLibrary() {
  const [selectedResource, setSelectedResource] = useState<typeof resources[0] | null>(null);

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-900 capitalize tracking-tighter text-lg">
            Knowledge Vault
          </h3>
          <a
            href="https://www.fao.org/publications/en"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 capitalize tracking-[0.2em]"
          >
            Full Catalog
          </a>
        </div>

        <div className="space-y-4">
          {resources.map((resource, index) => (
            <button
              key={index}
              onClick={() => setSelectedResource(resource)}
              className="cursor-pointer w-full text-left group flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-[9px] capitalize tracking-tighter ${resource.bg} ${resource.color}`}>
                {resource.type}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                  {resource.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black capitalize tracking-widest text-slate-400">
                    Source: {resource.source}
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-black text-slate-300 group-hover:text-emerald-500 transition-colors self-center capitalize tracking-widest">
                Read
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResource(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 bg-white z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-[9px] capitalize tracking-tighter ${selectedResource.bg} ${selectedResource.color}`}>
                    {selectedResource.type}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedResource.title}</h3>
                    <p className="text-xs text-slate-500 font-bold capitalize tracking-widest">{selectedResource.source}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="cursor-pointer px-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-900 capitalize tracking-[0.2em] transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative min-h-[300px] md:min-h-[400px]">
                {selectedResource.type === 'Video' ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden shadow-sm">
                    <iframe
                      src={selectedResource.content}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="prose prose-slate prose-emerald max-w-none bg-white p-6 rounded-xl shadow-sm">
                    <Markdown>{selectedResource.content}</Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
