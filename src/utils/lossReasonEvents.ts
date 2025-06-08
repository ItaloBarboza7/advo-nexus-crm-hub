
// Evento personalizado para sincronizar atualizações de motivos de perda
export const LOSS_REASON_UPDATED_EVENT = 'lossReasonUpdated';

export const dispatchLossReasonUpdate = () => {
  console.log('📢 [lossReasonEvents] Disparando evento de atualização de motivos de perda');
  window.dispatchEvent(new CustomEvent(LOSS_REASON_UPDATED_EVENT));
};

export const subscribeLossReasonUpdate = (callback: () => void) => {
  console.log('👂 [lossReasonEvents] Inscrevendo-se para eventos de atualização de motivos de perda');
  window.addEventListener(LOSS_REASON_UPDATED_EVENT, callback);
  
  return () => {
    console.log('🔇 [lossReasonEvents] Removendo inscrição de eventos de atualização de motivos de perda');
    window.removeEventListener(LOSS_REASON_UPDATED_EVENT, callback);
  };
};
