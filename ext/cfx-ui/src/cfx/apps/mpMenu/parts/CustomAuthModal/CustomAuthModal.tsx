import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BsX } from 'react-icons/bs';

import s from './CustomAuthModal.module.scss';

interface CustomAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PUBLIC_API_BASE = 'http://1.53.29.127:3030/auth';
const LOCAL_API_BASE = 'http://127.0.0.1:3030/auth';

let currentApiBase = PUBLIC_API_BASE;

const performFetch = async (endpoint: string, payload: any) => {
  try {
    const res = await fetch(`${currentApiBase}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res;
  } catch (err) {
    if (currentApiBase === PUBLIC_API_BASE) {
      currentApiBase = LOCAL_API_BASE;
      return fetch(`${currentApiBase}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    throw err;
  }
};


export const CustomAuthModal = observer(function CustomAuthModal({ isOpen, onClose }: CustomAuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setOtp('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowOtp(false);
  };

  const handleSwitchMode = (toLogin: boolean) => {
    setIsLogin(toLogin);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const res = await performFetch('login', { identifier: username, password });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Đăng nhập thất bại');
        }

        // Save token and close
        const storage = rememberMe ? window.localStorage : window.sessionStorage;
        storage.setItem('f8_auth_token', data.token);
        storage.setItem('f8_username', data.username);
        
        handleClose();

      } else {
        // --- REGISTER / OTP FLOW ---
        if (!showOtp) {
          // Register step 1: send user details, get OTP sent to email
          const res = await performFetch('register', { email, username, password });
          const data = await res.json();
          
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Đăng ký thất bại');
          }

          setSuccessMsg('Đã gửi mã OTP về email của bạn. Vui lòng kiểm tra hộp thư.');
          setShowOtp(true);

        } else {
          // Register step 2: Verify OTP
          const res = await performFetch('verify', { email, otp });
          const data = await res.json();
          
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Xác thực OTP thất bại');
          }

          setSuccessMsg('Đăng ký thành công! Hãy đăng nhập để vào game.');
          setTimeout(() => {
            handleSwitchMode(true);
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={handleClose}>
      <div className={s.modalContent} onClick={e => e.stopPropagation()}>
        <button className={s.closeButton} onClick={handleClose}>
          <BsX />
        </button>

        <div className={s.header}>
          <h2>{isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h2>
          <p>{isLogin ? 'Chào mừng trở lại với GTA5F8' : 'Tham gia cộng đồng GTA5F8 ngay hôm nay'}</p>
        </div>

        {errorMsg && <div style={{ color: '#ff5252', fontSize: '13px', textAlign: 'center', background: 'rgba(255,82,82,0.1)', padding: '8px', borderRadius: '8px' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#00e676', fontSize: '13px', textAlign: 'center', background: 'rgba(0,230,118,0.1)', padding: '8px', borderRadius: '8px' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!isLogin && !showOtp && (
            <div className={s.formGroup}>
              <label>Email (Gmail)</label>
              <input
                type="email"
                placeholder="Ví dụ: nguyenvan@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {(!isLogin && !showOtp) || isLogin ? (
            <>
              <div className={s.formGroup}>
                <label>{isLogin ? 'Tên tài khoản hoặc Email' : 'Tên tài khoản'}</label>
                <input
                  type="text"
                  placeholder="Nhập tên tài khoản"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className={s.formGroup}>
                <label>Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {isLogin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="rememberMe" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                    Ghi nhớ đăng nhập
                  </label>
                </div>
              )}
            </>
          ) : null}

          {!isLogin && showOtp && (
             <div className={s.formGroup}>
               <label>Mã OTP (gửi về email)</label>
               <input
                 type="text"
                 placeholder="Nhập mã 6 số"
                 value={otp}
                 onChange={e => setOtp(e.target.value)}
                 required
               />
             </div>
          )}

          <button type="submit" className={s.submitButton} disabled={loading}>
            {loading ? 'ĐANG XỬ LÝ...' : (isLogin ? 'VÀO GAME' : (showOtp ? 'XÁC THỰC OTP' : 'ĐĂNG KÝ'))}
          </button>
        </form>

        <div className={s.toggleMode}>
          {isLogin ? (
            <>
              Chưa có tài khoản?{' '}
              <button onClick={() => handleSwitchMode(false)}>Đăng ký ngay</button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button onClick={() => handleSwitchMode(true)}>Đăng nhập</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
