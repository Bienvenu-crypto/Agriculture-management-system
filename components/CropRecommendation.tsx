'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface CropRecommendationProps {
  location?: { lat: number; lon: number; name: string } | null;
}

export default function CropRecommendation({ location }: CropRecommendationProps) {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    ph: '',
    rainfall: '',
    temperature: '',
  });

  const handleAutoDetect = async () => {
    if (!location) {
      alert("Please allow location access to use auto-detection.");
      return;
    }

    setDetecting(true);
    try {
      const response = await fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`);

      const mockSoilByRegion = () => {
        const isArid = location.lat > 15 && location.lat < 35;
        const isTropical = Math.abs(location.lat) < 15;

        if (isArid) return { n: "20", p: "25", k: "15", ph: "7.8" };
        if (isTropical) return { n: "60", p: "45", k: "50", ph: "5.8" };
        return { n: "45", p: "35", k: "40", ph: "6.5" };
      };

      const soil = mockSoilByRegion();

      if (response.ok) {
        const data = await response.json();
        const current = data.current;

        setFormData({
          nitrogen: soil.n,
          phosphorus: soil.p,
          potassium: soil.k,
          ph: soil.ph,
          temperature: Math.round(current.temperature_2m).toString(),
          rainfall: current.showers > 0 || current.rain > 0 ? "250" : "120"
        });
      }
    } catch (error) {
      console.error("Detection Error:", error);
    } finally {
      setDetecting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Act as an expert agronomist. I have a farm with the following soil and environmental parameters:
- Nitrogen (N): ${formData.nitrogen} mg/kg
- Phosphorus (P): ${formData.phosphorus} mg/kg
- Potassium (K): ${formData.potassium} mg/kg
- Soil pH: ${formData.ph}
- Average Rainfall: ${formData.rainfall} mm
- Average Temperature: ${formData.temperature} °C

Based on these parameters, recommend the top 3 most suitable crops to plant. For each crop, briefly explain WHY it is suitable and give one quick tip for maximizing yield. Format the response clearly using Markdown.`;

      const executeWithRetry = async (retries = 3, initialDelay = 2000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ parts: [{ text: prompt }] }],
            });
          } catch (err: any) {
            console.warn(`Recommendation attempt ${i + 1} failed:`, err);
            const isRetryable = err.status === 503 || err.status === 429 ||
              err.message?.includes('503') || err.message?.includes('429') ||
              err.message?.includes('demand') || err.message?.includes('quota');

            if (isRetryable && i < retries - 1) {
              const waitTime = initialDelay * Math.pow(2, i);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw err;
          }
        }
      };

      const response = await executeWithRetry();
      if (!response) throw new Error("Service busy");

      setResult(response.text || "Could not generate recommendations. Please try again.");
    } catch (error) {
      console.error("Recommendation Error:", error);
      setResult("An error occurred while generating recommendations. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!result) return;
    const element = document.getElementById('recommendation-result');
    if (!element) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f0fdf4' // Match emerald-50
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.setFontSize(18);
      pdf.setTextColor(5, 150, 105);
      pdf.text("AgroBot Strategic Report", 10, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Soil Profile: N:${formData.nitrogen} P:${formData.phosphorus} K:${formData.potassium} | Temp: ${formData.temperature}°C`, 10, 22);

      pdf.addImage(imgData, 'PNG', 10, 30, pdfWidth, pdfHeight);
      pdf.save(`Crop_Strategy_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="bg-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Crop Intelligence</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">AI-driven output optimization</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nitrogen (N)</label>
              <input type="number" name="nitrogen" autoComplete="off" value={formData.nitrogen} onChange={handleChange} placeholder="mg/kg" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Phosphorus (P)</label>
              <input type="number" name="phosphorus" autoComplete="off" value={formData.phosphorus} onChange={handleChange} placeholder="mg/kg" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Potassium (K)</label>
              <input type="number" name="potassium" autoComplete="off" value={formData.potassium} onChange={handleChange} placeholder="mg/kg" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Soil pH</label>
              <input type="number" step="0.1" name="ph" autoComplete="off" value={formData.ph} onChange={handleChange} placeholder="0.0 - 14.0" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Rainfall (mm)</label>
              <input type="number" name="rainfall" autoComplete="off" value={formData.rainfall} onChange={handleChange} placeholder="mm/year" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Temp (°C)</label>
              <input type="number" name="temperature" autoComplete="off" value={formData.temperature} onChange={handleChange} placeholder="°C" className="w-full bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={detecting || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all mb-3"
          >
            <div className={`w-2 h-2 rounded-full ${detecting ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
            {detecting ? 'Detecting Environmental Data...' : 'Auto-Detect Environment'}
          </button>

          <button
            type="submit"
            disabled={loading || detecting}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing Data...' : 'Recommend Crops'}
          </button>
        </form>

        <div className="relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Running analysis...</p>
            </div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col"
            >
              <div id="recommendation-result" className="flex-1 p-8 overflow-y-auto mb-4">
                <div className="prose prose-sm max-w-none prose-emerald text-slate-700">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>

              <button
                onClick={downloadPDF}
                className="w-full bg-emerald-600 text-white rounded-2xl py-3 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Download PDF Report
              </button>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Awaiting Input Parameters</p>
              <p className="text-sm font-bold text-slate-400 max-w-[240px]">Enter soil and climate data or use "Auto-Detect" to generate localized crop recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
