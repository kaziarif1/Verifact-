import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, Globe, HeartPulse, FlaskConical, Monitor, Film, Trophy, DollarSign, Tag } from 'lucide-react';
import { claimsService } from '../services/claims.service';
import toast from 'react-hot-toast';

const CATS = ['politics','health','science','technology','entertainment','sports','finance','other'] as const;
const CAT_ICONS: Record<string,React.ElementType> = {
  politics:Globe, health:HeartPulse, science:FlaskConical, technology:Monitor,
  entertainment:Film, sports:Trophy, finance:DollarSign, other:Tag,
};

const schema = z.object({
  title: z.string().min(10,'Minimum 10 characters').max(200,'Maximum 200 characters'),
  body:  z.string().max(2000).optional(),
  category: z.enum(CATS),
});
type Form = z.infer<typeof schema>;

const STEPS = ['HEADLINE','BODY','EVIDENCE','REVIEW'];

export default function Submit() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [mediaFile, setMediaFile] = useState<File|null>(null);
  const [mediaPreview, setMediaPreview] = useState<string|null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState:{ errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { category:'other' },
  });
  const title = watch('title') || '';
  const category = watch('category');

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setMediaPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (d: Form) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', d.title);
      if (d.body) fd.append('body', d.body);
      fd.append('category', d.category);
      if (mediaFile) fd.append('media', mediaFile);
      const res = await claimsService.create(fd);
      setSubmitted(true);
      setTimeout(() => nav(`/claims/${res.data.data._id}`), 2200);
    } catch (e:any) {
      toast.error(e?.response?.data?.error?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <motion.div initial={{ scale:0, rotate:-10 }} animate={{ scale:1, rotate:0 }}
        transition={{ type:'spring', stiffness:180, damping:14 }}>
        <CheckCircle2 className="w-20 h-20 mb-4" style={{ color:'var(--fact-green)' }} />
      </motion.div>
      <h2 className="font-headline text-3xl font-bold mb-2" style={{ color:'var(--ink)' }}>Story Submitted!</h2>
      <p className="font-sans text-sm" style={{ color:'var(--ink-faint)' }}>
        AI analysis is running. Redirecting to your claim...
      </p>
      <div className="w-48 h-0.5 mt-4 overflow-hidden" style={{ background:'var(--paper-mid)' }}>
        <motion.div className="h-full" style={{ background:'var(--ink)' }}
          initial={{ width:0 }} animate={{ width:'100%' }} transition={{ duration:2, ease:'linear' }} />
      </div>
    </div>
  );

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
        <p className="news-kicker mb-1">EDITORIAL DESK</p>
        <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Submit a Story</h1>
        <p className="font-sans text-sm mt-1" style={{ color:'var(--ink-faint)' }}>
          Share a claim for community verification and AI analysis.
        </p>
      </motion.div>

      {/* Step progress — newspaper column numbers */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s,i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 flex items-center justify-center font-mono text-sm font-black transition-all"
                style={{
                  background: i<step ? 'var(--fact-green)' : i===step ? 'var(--ink)' : 'transparent',
                  color: i<=step ? 'var(--paper)' : 'var(--ink-faint)',
                  border: `1.5px solid ${i<=step ? 'transparent' : 'var(--paper-mid)'}`,
                }}>
                {i<step ? <CheckCircle2 className="w-4 h-4" /> : String(i+1).padStart(2,'0')}
              </div>
              <span className="font-sans text-[9px] font-bold tracking-widest" style={{ color: i===step ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {s}
              </span>
            </div>
            {i<STEPS.length-1 && (
              <div className="flex-1 h-px mx-2 transition-all"
                style={{ background: i<step ? 'var(--ink)' : 'var(--paper-mid)' }} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0"
                initial={{ x:30, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:-30, opacity:0 }}
                className="space-y-5">
                <div>
                  <label className="font-sans text-xs font-bold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>
                    Headline * ({title.length}/200)
                  </label>
                  <textarea {...register('title')} rows={3}
                    placeholder="Write the claim you want to verify..."
                    className="input-ink resize-none font-headline text-lg"
                    style={{ lineHeight:1.35 }} />
                  {errors.title && <p className="font-sans text-xs mt-1" style={{ color:'var(--rumor-red)' }}>{errors.title.message}</p>}
                </div>
                <div>
                  <label className="font-sans text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color:'var(--ink-faint)' }}>
                    Category *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATS.map(c => {
                      const Icon = CAT_ICONS[c] || Tag;
                      return (
                        <button key={c} type="button" onClick={() => setValue('category', c)}
                          className="flex flex-col items-center gap-1 py-3 transition-all font-sans text-xs font-semibold capitalize"
                          style={{
                            border: `1.5px solid ${category===c ? 'var(--ink)' : 'var(--paper-mid)'}`,
                            background: category===c ? 'var(--ink)' : 'transparent',
                            color: category===c ? 'var(--paper)' : 'var(--ink-faint)',
                            borderRadius:'1px',
                          }}>
                          <Icon className="w-4 h-4" />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1"
                initial={{ x:30, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:-30, opacity:0 }}>
                <label className="font-sans text-xs font-bold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>
                  Body Text <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span>
                </label>
                <textarea {...register('body')} rows={8}
                  placeholder="Provide context, sources, or additional details about this claim..."
                  className="input-ink resize-none font-sans text-sm" style={{ lineHeight:1.6 }} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2"
                initial={{ x:30, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:-30, opacity:0 }}>
                <label className="font-sans text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color:'var(--ink-faint)' }}>
                  Evidence / Media <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span>
                </label>
                {mediaPreview ? (
                  <div className="relative">
                    {mediaFile?.type.startsWith('video') ?
                      <video src={mediaPreview} className="w-full max-h-56 object-contain" style={{ background:'var(--paper-dark)' }} /> :
                      <img src={mediaPreview} alt="preview" className="w-full max-h-56 object-contain" style={{ background:'var(--paper-dark)' }} />
                    }
                    <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      className="absolute top-2 right-2 p-1 font-bold"
                      style={{ background:'var(--ink)', color:'var(--paper)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors"
                    style={{ border:'2px dashed var(--paper-mid)', background:'var(--paper-dark)' }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--ink)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--paper-mid)')}>
                    <Upload className="w-8 h-8" style={{ color:'var(--ink-faint)' }} />
                    <div className="text-center">
                      <p className="font-sans text-sm font-semibold" style={{ color:'var(--ink)' }}>Drop or click to upload</p>
                      <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>JPEG · PNG · MP4 · Max 50MB</p>
                    </div>
                    <input type="file" accept="image/*,video/mp4" className="hidden" onChange={handleMedia} />
                  </label>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3"
                initial={{ x:30, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:-30, opacity:0 }}
                className="paper-card p-5 space-y-3">
                <p className="font-sans text-xs font-bold tracking-widest uppercase pb-2"
                  style={{ color:'var(--ink-faint)', borderBottom:'1px solid var(--paper-mid)' }}>
                  Review Your Story
                </p>
                <div>
                  <span className="news-kicker">{category?.toUpperCase()}</span>
                  <h3 className="font-headline text-xl font-bold mt-1" style={{ color:'var(--ink)' }}>{title}</h3>
                </div>
                {mediaPreview && (
                  <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>
                    Media attached: {mediaFile?.name}
                  </p>
                )}
                <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>
                  Once submitted, this claim will be analyzed by our AI and put to community vote.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s=>s-1)} className="btn-outline !py-2.5 !px-5">
                ← Back
              </button>
            )}
            {step < 3 && (
              <button type="button" onClick={() => setStep(s=>s+1)}
                disabled={step===0 && title.length<10}
                className="btn-ink !py-2.5 flex-1">
                Continue →
              </button>
            )}
            {step === 3 && (
              <button type="submit" disabled={loading}
                className="btn-ink !py-2.5 flex-1 flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:'transparent', borderTopColor:'var(--paper)' }} />Publishing...</>
                  : 'Publish Story →'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
