import { User } from 'lucide-react'

export default function PageHeader({ title, subtitle, user, profile, stats, bgColor = '#1e3a8a' }) {
    return (
        <div className="shadow-md z-30 shrink-0" style={{ backgroundColor: bgColor }}>
            {/* Top Row: Logo - Profile - Title */}
            <div className="relative px-8 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Logo Section */}
                <div className="w-80 flex flex-col items-center sm:items-start text-center sm:text-left">
                    <img src="/wasion_logo_large.png" alt="Wasion Logo" className="h-10 object-contain ml-10" />
                    <div className="text-white text-[10px] font-bold tracking-[0.8em] uppercase opacity-90 mt-0 w-full leading-none ml-10">
                        Made in Mexico
                    </div>
                </div>

                {/* User Profile Section - Center aligned absolutely to the Top Row */}
                {(profile || user) && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-4 bg-primary-800/40 rounded-full pr-6 pl-2 py-1.5 border border-primary-700/50 shadow-sm z-20">
                        <div className="h-12 w-12 rounded-full ring-2 ring-white/20 overflow-hidden bg-primary-700 flex items-center justify-center shrink-0">
                            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-7 w-7 text-primary-300" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm tracking-wide leading-tight">
                                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span className="text-primary-300 text-[10px] font-medium uppercase tracking-wider">
                                {profile?.role || 'User'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Title Section */}
                <div className="text-center sm:text-right">
                    <h1 className="text-2xl font-extrabold text-white tracking-widest leading-tight uppercase">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-primary-200 mt-0 text-sm font-medium tracking-wide">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Bottom Row: Dashboard Stats */}
            {stats && (
                <div className="px-8 pb-3 pt-1 flex justify-center sm:justify-start">
                    {stats}
                </div>
            )}
        </div>
    )
}
