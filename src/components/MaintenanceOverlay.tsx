import { Component } from "solid-js";
import styles from "./MaintenanceOverlay.module.css";

const MaintenanceOverlay: Component = () => {
  return (
    <div class={styles.overlay}>
      <div class={styles.container}>
        <div class={styles.content}>
          <div class={styles.icon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 class={styles.title}>Service Temporarily Unavailable</h1>
          <p class={styles.message}>
            We sincerely apologize for the inconvenience. Our service is temporarily unavailable due to essential maintenance and infrastructure updates. We are working diligently to restore full functionality as quickly as possible.
          </p>
          <p class={styles.thanks}>
            Thank you for your patience and understanding.
          </p>
          <div class={styles.status}>
            <div class={styles.statusIndicator}></div>
            <span>Maintenance in progress</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;