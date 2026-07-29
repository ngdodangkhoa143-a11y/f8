import { observer } from 'mobx-react-lite';
import React from 'react';
import { BsPlayFill, BsDiscord, BsX, BsPersonFill } from 'react-icons/bs';

import { useService } from 'cfx/base/servicesContainer';
import { IAccountService, useAccountService } from 'cfx/common/services/account/account.service';
import { ISettingsUIService } from 'cfx/common/services/settings/settings.service';
import { useAuthService } from 'cfx/apps/mpMenu/services/auth/auth.service';
import { IServersConnectService } from 'cfx/common/services/servers/serversConnect.service';
import { IPlatformStatusService, usePlatformStatusService } from 'cfx/apps/mpMenu/services/platformStatus/platformStatus.service';
import { StatusLevel } from 'cfx/apps/mpMenu/services/platformStatus/types';
import { useEventHandler } from 'cfx/common/services/analytics/analytics.service';
import { EventActionNames, ElementPlacements } from 'cfx/common/services/analytics/types';
import { mpMenu } from 'cfx/apps/mpMenu/mpMenu';
import { useMpMenuServersConnectService } from 'cfx/apps/mpMenu/services/servers/serversConnect.mpMenu';
import { CustomAuthModal } from 'cfx/apps/mpMenu/parts/CustomAuthModal/CustomAuthModal';

import s from './HomePage.module.scss';

// CẤU HÌNH IP SERVER Ở ĐÂY ĐỂ NGƯỜI CHƠI KHÁC VÀO
export const SERVER_CONNECT_IP = 'localhost:30120';
const LAUNCHER_VERSION = 'Ver ' + Math.floor(Math.random() * 1000000000); // Random or static version

export const HomePage = observer(function HomePage() {
  const AuthService = useAuthService();
  const AccountService = useAccountService();
  const SettingsUIService = useService(ISettingsUIService);
  const ServersConnectService = useService(IServersConnectService);
  const PlatformStatusService = usePlatformStatusService();
  const eventHandler = useEventHandler();
  const ConnectService = useMpMenuServersConnectService();

  // Play button loading state (fallback)
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(false);
  
  // Custom Auth state
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  
  // State for logged in user (check localStorage first, then sessionStorage)
  const authToken = window.localStorage.getItem('f8_auth_token') || window.sessionStorage.getItem('f8_auth_token');
  const authUser = window.localStorage.getItem('f8_username') || window.sessionStorage.getItem('f8_username');

  // Get server status
  const isOnline = PlatformStatusService.level === StatusLevel.AllSystemsOperational;
  
  // Get player count
  const playersCurrent = PlatformStatusService.hasStats ? PlatformStatusService.stats.current : '0';
  const playersMax = '1024';

  // Handle play click - Direct Connect
  const handlePlayClick = React.useCallback(() => {
    if (isLoading) return;

    if (!window.localStorage.getItem('f8_auth_token') && !window.sessionStorage.getItem('f8_auth_token')) {
      setIsAuthOpen(true);
      return;
    }

    setIsLoading(true);
    setShowSplash(false);

    eventHandler({
      action: EventActionNames.PlayCTA,
      properties: {
        element_placement: ElementPlacements.Continuity,
        text: '#BottomNav_Play',
        link_url: SERVER_CONNECT_IP,
      },
    });

    ServersConnectService.connectTo(SERVER_CONNECT_IP);
  }, [isLoading, eventHandler, ServersConnectService]);

  // Handle connection state reading
  let isConnecting = false;
  let connectPercentage = 0;
  let connectMessage = 'ĐANG KẾT NỐI...';
  
  if (ConnectService.resolvingServer) {
    isConnecting = true;
  } else if (ConnectService.state) {
    if (ConnectService.state.type === 'connecting') {
      isConnecting = true;
    } else if (ConnectService.state.type === 'status') {
      isConnecting = true;
      const { count, total, message } = ConnectService.state;
      if (total > 0) {
        connectPercentage = Math.min((count / total) * 100, 100);
      } else {
        connectPercentage = 100;
      }
      connectMessage = `${Math.floor(connectPercentage)}%`;
    }
  }

  // Fallback visual state if our local isLoading is true but service hasn't updated yet
  const displayConnecting = isLoading || isConnecting;

  // Handle Discord click
  const handleDiscordClick = React.useCallback(() => {
    mpMenu.invokeNative('openUrl', 'https://discord.gg/fivem');
  }, []);

  // Handle Auth click / Logout
  const handleAuthClick = React.useCallback(() => {
    if (window.localStorage.getItem('f8_auth_token') || window.sessionStorage.getItem('f8_auth_token')) {
      // Logout
      window.localStorage.removeItem('f8_auth_token');
      window.localStorage.removeItem('f8_username');
      window.sessionStorage.removeItem('f8_auth_token');
      window.sessionStorage.removeItem('f8_username');
      // force re-render
      setIsAuthOpen(false); 
      window.location.reload();
    } else {
      setIsAuthOpen(true);
    }
  }, []);

  // Handle Exit
  const handleExitClick = React.useCallback(() => {
    mpMenu.invokeNative('exit');
  }, []);

  const playButtonClassName = displayConnecting
    ? `${s.playButton} ${s.playButtonLoading}`
    : (!authToken ? `${s.playButton} ${s.playButtonDisabled}` : s.playButton);

  return (
    <div className={s.homepage}>
      
      {/* ===== LEFT PANEL ===== */}
      <div className={s.leftPanel}>
        <div className={s.header}>
          <h1 className={s.serverName}>GTA5F8</h1>
          <p className={s.caption}>ROLEPLAY • CHIẾM ĐÓNG • XÂY DỰNG • THỐNG TRỊ</p>
        </div>

        <div className={s.introBox}>
          Một thành phố nhập vai tập trung vào nhịp sống, phi vụ, tổ chức và câu chuyện nhân vật. Vào game, chọn vai, tạo dấu ấn của riêng bạn.
        </div>

        <div className={s.statsGrid}>
          <div className={s.statBox}>
            <span className={s.statValue}>{playersCurrent}</span>
            <span className={s.statLabel}>Người Chơi</span>
          </div>
          <div className={s.statBox}>
            <span className={s.statValue}>{playersMax}</span>
            <span className={s.statLabel}>Sức Chứa</span>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className={s.rightPanel}>
        
        {/* TOP ACTIONS */}
        <div className={s.topActions}>
          <button className={s.actionButton} onClick={handleDiscordClick}>
            <BsDiscord />
          </button>

          <button className={s.actionButton} onClick={handleAuthClick}>
            <BsPersonFill /> {authUser ? `ĐĂNG XUẤT (${authUser})` : 'TÀI KHOẢN'}
          </button>

          <button className={s.exitButton} onClick={handleExitClick}>
            <BsX />
          </button>
        </div>

        {/* STATUS BOX */}
        <div className={s.statusBox}>
          <div className={s.statusHeader}>
            <span className={s.statusTitle}>TRẠNG THÁI SERVER</span>
            <div className={s.statusIndicator}>
              <div className={isOnline ? s.statusOnline : s.statusOffline} style={{ width: 10, height: 10, borderRadius: '50%' }} />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className={s.infoBox}>
            <div className={s.infoTitle}>Ưu tiên trải nghiệm roleplay</div>
            <div className={s.infoText}>Giao diện mới tập trung vào thao tác nhanh và trạng thái rõ ràng.</div>
          </div>

          <div className={s.infoBox}>
            <div className={s.infoTitle}>Xác thực tài khoản</div>
            <div className={s.infoText}>OTP bắt buộc trước khi đăng nhập và bấm chơi.</div>
          </div>
        </div>

        {/* PLAY SECTION */}
        <div className={s.playSection}>
          <button className={playButtonClassName} onClick={handlePlayClick} disabled={!authToken || displayConnecting}>
            
            {!displayConnecting && (
              <div className={s.playButtonContent}>
                <div className={s.playTextWrapper}>
                  <span className={s.playTitle}>CHƠI NGAY</span>
                  <span className={s.playSub}>{authToken ? 'KẾT NỐI VÀO MÁY CHỦ' : 'CẦN ĐĂNG NHẬP TRƯỚC KHI VÀO'}</span>
                </div>
                <div className={s.playIconWrapper}>
                  <BsPlayFill />
                </div>
              </div>
            )}

            {displayConnecting && (
              <>
                <div className={s.progressFill} style={{ width: `${Math.max(connectPercentage, 5)}%` }} />
                <div className={s.loadingText}>{connectMessage}</div>
              </>
            )}

          </button>
        </div>

      </div>

      {/* ===== BOTTOM WELCOME ===== */}
      <div className={s.bottomWelcome}>
        <div className={s.welcomeTop}>PRIME AREA</div>
        <h2 className={s.welcomeBottom}>WELCOME</h2>
      </div>

      {/* Custom Auth Modal */}
      <CustomAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
});
