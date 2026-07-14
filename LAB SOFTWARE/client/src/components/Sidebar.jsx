import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LayoutDashboard, Users, ReceiptText, FlaskConical, 
  FileSpreadsheet, Stethoscope, UserCheck, Download, 
  Settings, ChevronLeft, ChevronRight, Activity, CreditCard, ShieldCheck, PenTool, MessageCircle, X
} from 'lucide-react';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [labName, setLabName] = useState('Jyothi Lab');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data && res.data.receipt_header && res.data.receipt_header.labName) {
          setLabName(res.data.receipt_header.labName);
        }
      } catch (err) {
        console.error('Failed to fetch lab name:', err);
      }
    };
    fetchSettings();
  }, []);
  
  // Track swipe gesture for mobile close
  const touchStartX = useRef(null);
  
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    // Swipe left ≥ 60px closes the sidebar
    if (deltaX >= 60) {
      setMobileOpen(false);
    }
    touchStartX.current = null;
  };

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['Admin', 'Receptionist', 'Pathologist', 'Lab Technician', 'Staff', 'Doctor']
    },
    {
      name: 'Patients',
      path: '/patients',
      icon: Users,
      roles: ['Admin', 'Receptionist', 'Pathologist', 'Lab Technician', 'Staff', 'Doctor']
    },
    {
      name: 'Billing Desk',
      path: '/billing',
      icon: ReceiptText,
      roles: ['Admin', 'Receptionist']
    },
    {
      name: 'Payment History',
      path: '/payments',
      icon: CreditCard,
      roles: ['Admin', 'Receptionist']
    },
    {
      name: 'Claim Tracking',
      path: '/claims',
      icon: ShieldCheck,
      roles: ['Admin', 'Receptionist']
    },
    {
      name: 'Tests Catalog',
      path: '/tests',
      icon: FlaskConical,
      roles: ['Admin', 'Pathologist', 'Lab Technician']
    },
    {
      name: 'Reports Queue',
      path: '/reports',
      icon: FileSpreadsheet,
      roles: ['Admin', 'Pathologist', 'Lab Technician', 'Doctor']
    },
    {
      name: 'Referral Doctors',
      path: '/doctors',
      icon: Stethoscope,
      roles: ['Admin', 'Receptionist']
    },
    {
      name: 'Staff Management',
      path: '/employees',
      icon: UserCheck,
      roles: ['Admin']
    },
    {
      name: 'Data Exports',
      path: '/exports',
      icon: Download,
      roles: ['Admin', 'Pathologist']
    },
    {
      name: 'Signatures',
      path: '/signatures',
      icon: PenTool,
      roles: ['Admin', 'Pathologist', 'Doctor']
    },
    {
      name: 'WhatsApp Delivery',
      path: '/whatsapp',
      icon: MessageCircle,
      roles: ['Admin', 'Receptionist', 'Pathologist']
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['Admin']
    }
  ];

  // Filter routes based on user roles
  const filteredMenu = menuItems.filter(item => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return item.roles.includes(user.role);
  });

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-navy-900 text-white transition-all duration-300 ease-in-out dark:border-navy-800 sm:relative sm:translate-x-0 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } ${
        collapsed ? 'w-[72px]' : 'w-64'
      } min-h-screen`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-navy-800 shrink-0">
        <Link 
          to="/" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 overflow-hidden hover:opacity-90 transition-opacity min-w-0"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-500 text-white shadow-lg shadow-coral-500/30">
            <Activity size={20} />
          </div>
          <span className={`text-base font-bold tracking-wide text-white whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${
            collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[180px] opacity-100'
          }`}>
            {labName.split(' ')[0]} <span className="text-coral-500">{labName.split(' ').slice(1).join(' ')}</span>
          </span>
        </Link>
        {/* Mobile close menu button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-800 hover:text-white transition-colors sm:hidden shrink-0"
          title="Close Navigation Menu"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* User info strip (mobile only) */}
      {!collapsed && (
        <div className="sm:hidden border-b border-navy-800 px-4 py-3 shrink-0">
          <p className="text-xs font-bold text-white truncate">{user?.name}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-coral-500/15 px-2 py-0.5 text-[10px] font-bold text-coral-400 mt-0.5">
            {user?.role}
          </span>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 space-y-0.5 py-3 px-2.5 overflow-y-auto overscroll-contain">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                  collapsed ? 'justify-center gap-0' : 'gap-3'
                } ${
                  isActive 
                    ? 'bg-coral-500 text-white shadow-md shadow-coral-500/30' 
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white active:bg-navy-700'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon size={19} className="shrink-0" />
              <span className={`truncate transition-all duration-300 ease-in-out overflow-hidden ${
                collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[150px] opacity-100'
              }`}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle — desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-5 -right-3.5 hidden sm:flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-800 shadow-md hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

export default Sidebar;
