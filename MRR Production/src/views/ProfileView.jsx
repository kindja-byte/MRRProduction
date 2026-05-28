// src/views/ProfileView.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { C } from '../utils/helpers';
import { Fld, Inp, Btn } from '../components/UIPrimitives';

export default function ProfileView({ user, onUpdateUser }) {
  // Identity Info States
  const [name, setName] = useState(user.name || user.full_name || '');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', isError: false });

  // Low Stock Routing Alert States
  const [alertPhone, setAlertPhone] = useState(user?.phone_number || '');
  const [alertSms, setAlertSms] = useState(user?.receive_sms_alerts || false);
  const [alertEmail, setAlertEmail] = useState(user?.receive_email_alerts || false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ text: '', isError: false });

  // Access Credentials States
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);
  const [passMsg, setPassMsg] = useState({ text: '', isError: false });

  // Sync internal alerts values if user changes globally
  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || '');
      setAlertPhone(user.phone_number || '');
      setAlertSms(user.receive_sms_alerts || false);
      setAlertEmail(user.receive_email_alerts || false);
    }
  }, [user]);

  // Action 1: Handle Profile Name Updates
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: '', isError: false });
    if (!name.trim()) return setProfileMsg({ text: 'Name cannot be empty.', isError: true });

    setSubmittingProfile(true);
    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: name.trim() }
    });

    if (authError) {
      setSubmittingProfile(false);
      return setProfileMsg({ text: `Auth Error: ${authError.message}`, isError: true });
    }

    const { error: dbError } = await supabase.from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id);

    setSubmittingProfile(false);

    if (dbError) {
      setProfileMsg({ text: `Database Error: ${dbError.message}`, isError: true });
    } else {
      setProfileMsg({ text: '🎉 Profile permanently saved!', isError: false });
      onUpdateUser({ ...user, name: name.trim(), full_name: name.trim() });
    }
  };

  // Action 2: Handle Low Stock Notification Routing Rules
  const saveNotificationPreferences = async (e) => {
  e.preventDefault();
  setAlertMsg({ text: '', isError: false });

  // 1. Frontend validation gate: ensure phone is provided if SMS alerts are checked
  if (alertSms && !alertPhone.trim()) {
    return setAlertMsg({ text: 'Please enter phone number', isError: true });
  }

  setSavingAlerts(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        phone_number: alertPhone.trim(),
        receive_sms_alerts: alertSms,
        receive_email_alerts: alertEmail
      })
      .eq('id', user.id);

    setSavingAlerts(false);
    
    if (error) {
      setAlertMsg({ text: `Error updating routing: ${error.message}`, isError: true });
    } else {
      // Pass states upstream so the configuration sticks globally
      onUpdateUser({
        ...user,
        phone_number: alertPhone.trim(),
        receive_sms_alerts: alertSms,
        receive_email_alerts: alertEmail
      });
      setAlertMsg({ text: '🔔 Alert routing updated successfully!', isError: false });
    }
  };

  // Action 3: Handle Security Password Modification Requests
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg({ text: '', isError: false });

    if (newPass.length < 8) {
      return setPassMsg({ text: 'New password must be at least 8 characters long.', isError: true });
    }
    if (newPass !== confirmPass) {
      return setPassMsg({ text: 'New passwords do not match.', isError: true });
    }

    setSubmittingPass(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPass,
    });

    if (verifyError) {
      setSubmittingPass(false);
      return setPassMsg({ text: 'Incorrect current password. Please try again.', isError: true });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setSubmittingPass(false);

    if (updateError) {
      setPassMsg({ text: `System Error: ${updateError.message}`, isError: true });
    } else {
      setPassMsg({ text: '🎉 Password updated successfully!', isError: false });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500, margin: '20px auto' }}>
      
      {/* CARD 1: Identity Profile Credentials */}
      <div style={{ background: C.w, borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 900, color: C.navy }}>👤 Personal Profile</h1>
        <p style={{ margin: '0 0 20px', color: C.sub, fontSize: 13 }}>Manage your account identity details</p>
        
        <form onSubmit={handleProfileUpdate}>
          <Fld label="Full Name"><Inp type="text" value={name} onChange={e => setName(e.target.value)} required /></Fld>
          <Fld label="Email Address"><Inp type="email" value={user.email} disabled style={{ background: '#f5f5f5', color: C.sub, cursor: 'not-allowed' }} /></Fld>
          <Fld label="System Permissions Level">
            <div style={{ background: 'rgba(245,168,0,0.08)', border: `1px solid ${C.gold}`, color: C.navy, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
              🛡️ {user.role || 'Employee'} Account
            </div>
          </Fld>
          {profileMsg.text && <div style={{ background: profileMsg.isError ? C.rB : C.gB, color: profileMsg.isError ? C.rd : C.gr, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{profileMsg.text}</div>}
          <Btn v="gold" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={submittingProfile}>{submittingProfile ? 'Saving Changes...' : 'Save Profile Details'}</Btn>
        </form>
      </div>

      {/* CARD 2: Low Stock Dynamic Notification Toggles */}
      <div style={{ background: C.w, borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: C.navy }}>🔔 Inventory Alert Preferences</h2>
        <p style={{ margin: '0 0 20px', color: C.sub, fontSize: 13 }}>Choose how you want to be notified when items hit low-stock thresholds.</p>
        
        <form onSubmit={saveNotificationPreferences}>
          <Fld label="Cell Phone Number (For SMS)">
            <Inp type="tel" placeholder="(260) 555-0199" value={alertPhone} onChange={e => setAlertPhone(e.target.value)} />
          </Fld>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 12, color: C.navy, fontWeight: 600 }}>
            <input type="checkbox" checked={alertSms} onChange={e => setAlertSms(e.target.checked)} style={{ width: 17, height: 17 }} />
            <span>Enable Text Message (SMS) Alerts</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 20, color: C.navy, fontWeight: 600 }}>
            <input type="checkbox" checked={alertEmail} onChange={e => setAlertEmail(e.target.checked)} style={{ width: 17, height: 17 }} />
            <span>Enable Email Notifications</span>
          </label>

          {alertMsg.text && <div style={{ background: alertMsg.isError ? C.rB : C.gB, color: alertMsg.isError ? C.rd : C.gr, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{alertMsg.text}</div>}
          <Btn v="primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={savingAlerts}>{savingAlerts ? 'Saving Rules...' : 'Save Notification Prefs'}</Btn>
        </form>
      </div>

      {/* CARD 3: Account Access Security Credentials */}
      <div style={{ background: C.w, borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: C.navy }}>🔐 Access Credentials</h2>
        <p style={{ margin: '0 0 20px', color: C.sub, fontSize: 13 }}>Change your current login security details</p>
        
        <form onSubmit={handlePasswordChange}>
          <Fld label="Current Password"><Inp type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required /></Fld>
          <hr style={{ border: 'none', borderTop: `1px dashed ${C.bd}`, margin: '16px 0' }} />
          <Fld label="New Password"><Inp type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required /></Fld>
          <Fld label="Confirm New Password"><Inp type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required /></Fld>
          {passMsg.text && <div style={{ background: passMsg.isError ? C.rB : C.gB, color: passMsg.isError ? C.rd : C.gr, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{passMsg.text}</div>}
          <Btn v="gold" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={submittingPass}>{submittingPass ? 'Updating...' : 'Update Password'}</Btn>
        </form>
      </div>
    </div>
  );
}