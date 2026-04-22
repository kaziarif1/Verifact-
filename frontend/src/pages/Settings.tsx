import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { Camera, AlertTriangle, Lock, User, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { usersService } from '../services/users.service';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  displayName: z.string().min(2).max(50),
  username:    z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  bio:         z.string().max(200).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const TABS = ['Profile','Password','Notifications','Danger Zone'] as const;
type Tab = typeof TABS[number];

export default function Settings() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('Profile');

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName:user?.displayName??'', username:user?.username??'', bio:user?.bio??'' },
  });

  const onSave = async (d: ProfileForm) => {
    try {
      const { data } = await usersService.updateProfile(d);
      updateUser(data.data); qc.invalidateQueries({queryKey:['profile']});
      toast.success('Profile saved!');
    } catch (e:any) { toast.error(e?.response?.data?.error?.message || 'Update failed'); }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { data } = await usersService.uploadAvatar(f);
      updateUser({ avatarUrl:data.data.avatarUrl }); toast.success('Avatar updated!');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <div>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="mb-6 pb-4" style={{ borderBottom:'3px double var(--rule)' }}>
        <p className="news-kicker mb-1">ACCOUNT</p>
        <h1 className="font-headline text-4xl font-black" style={{ color:'var(--ink)' }}>Settings</h1>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-6" style={{ borderBottom:'2px solid var(--rule)' }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className="font-sans text-xs font-bold tracking-wide uppercase px-4 py-2 transition-all"
            style={{
              borderBottom: tab===t ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: '-2px',
              color: tab===t ? 'var(--ink)' : 'var(--ink-faint)',
              letterSpacing: '0.5px',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-md">
        {tab === 'Profile' && (
          <motion.div initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }} className="space-y-5">
            {/* Avatar */}
            <div className="paper-card p-4">
              <p className="font-sans text-xs font-bold tracking-widest uppercase mb-3" style={{ color:'var(--ink-faint)' }}>
                Profile Photo
              </p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar src={user?.avatarUrl} name={user?.displayName} size="xl"/>
                  <button onClick={()=>fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center"
                    style={{ background:'var(--ink)', color:'var(--paper)' }}>
                    <Camera className="w-4 h-4"/>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange}/>
                </div>
                <p className="font-sans text-xs" style={{ color:'var(--ink-faint)', lineHeight:1.5 }}>
                  JPEG, PNG, WebP · Max 5 MB
                </p>
              </div>
            </div>

            {/* Profile form */}
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              {[
                { name:'displayName', label:'Display Name' },
                { name:'username',    label:'Username'     },
              ].map(({ name, label })=>(
                <div key={name}>
                  <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>{label}</label>
                  <input {...form.register(name as any)} className={`input-ink ${(form.formState.errors as any)[name]?'error':''}`}/>
                  {(form.formState.errors as any)[name] && (
                    <p className="font-sans text-xs mt-1" style={{ color:'var(--rumor-red)' }}>{(form.formState.errors as any)[name]?.message}</p>
                  )}
                </div>
              ))}
              <div>
                <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>Bio</label>
                <textarea {...form.register('bio')} rows={3} maxLength={200} className="input-ink resize-none"/>
              </div>
              <button type="submit" disabled={form.formState.isSubmitting} className="btn-ink w-full py-2.5">
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        )}

        {tab === 'Password' && (
          <motion.div initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }}
            className="paper-card p-5 space-y-4">
            <p className="font-sans text-xs font-bold tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>Change Password</p>
            {['Current Password','New Password','Confirm Password'].map(l=>(
              <div key={l}>
                <label className="font-sans text-xs font-semibold tracking-widest uppercase mb-1.5 block" style={{ color:'var(--ink-faint)' }}>{l}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--ink-faint)' }}/>
                  <input type="password" className="input-ink pl-10"/>
                </div>
              </div>
            ))}
            <button className="btn-ink w-full py-2.5">Update Password</button>
          </motion.div>
        )}

        {tab === 'Notifications' && (
          <motion.div initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }}
            className="paper-card p-5 space-y-4">
            <p className="font-sans text-xs font-bold tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>Notification Preferences</p>
            {[
              ['Verdict on your claims','When admin reviews your submission',true],
              ['Verified status granted','Trust score milestones',true],
              ['New followers','Someone follows your profile',false],
              ['Direct messages','New messages from other users',true],
              ['Vote milestones','Your claim reaches 10/50/100 votes',false],
            ].map(([l,d,def])=>(
              <div key={l as string} className="flex items-start gap-3 py-2" style={{ borderBottom:'1px solid var(--paper-mid)' }}>
                <div className="flex-1">
                  <p className="font-sans text-sm font-semibold" style={{ color:'var(--ink)' }}>{l as string}</p>
                  <p className="font-sans text-xs" style={{ color:'var(--ink-faint)' }}>{d as string}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                  <input type="checkbox" defaultChecked={def as boolean} className="sr-only peer"/>
                  <div className="w-9 h-5 rounded-full transition-colors peer-checked:bg-ink peer-checked:[background:var(--ink)]" style={{ background:'var(--paper-mid)' }}>
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4" style={{ background:'var(--paper)' }}/>
                  </div>
                </label>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'Danger Zone' && (
          <motion.div initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }}
            className="paper-card p-5" style={{ borderTop:'3px solid var(--rumor-red)' }}>
            <p className="font-sans text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-2" style={{ color:'var(--rumor-red)' }}>
              <AlertTriangle className="w-4 h-4"/> Danger Zone
            </p>
            <p className="font-sans text-sm mb-4" style={{ color:'var(--ink-faint)', lineHeight:1.5 }}>
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button
              onClick={()=>toast.error('Contact support@verifact.app to delete your account.')}
              className="btn-outline flex items-center gap-2"
              style={{ color:'var(--rumor-red)', borderColor:'var(--rumor-red)' }}>
              <AlertTriangle className="w-3.5 h-3.5"/> Delete Account
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
