/* =====================================================================
   KONFIGURACJA EMAILJS — jedyne miejsce, w które wklejasz swoje dane.
   Ten plik nie zmienia się przy kolejnych aktualizacjach strony,
   więc klucze wpisujesz tylko raz.
   ---------------------------------------------------------------------
   PUBLIC_KEY            → Account → General → Public Key
   SERVICE_ID            → Email Services → (Twoja skrzynka) → Service ID
   TEMPLATE_ID           → Email Templates → szablon wiadomości DO SALONU
   AUTOREPLY_TEMPLATE_ID → (opcjonalnie) potwierdzenie DLA KLIENTKI, inaczej ''
   DEBUG                 → true pokazuje techniczną przyczynę błędu (do testów)

   Zmienne dostępne w szablonach EmailJS (oba formularze):
     {{name}} {{email}} {{reply_to}} {{phone}} {{topic}} {{message}} {{sent_at}}
   Dodatkowo z formularza „Zapytaj o termin” (szkolenia):
     {{course}} {{course_price}} {{course_duration}} {{preferred_date}}
   Wskazówka: w treści szablonu użyj
     <div style="white-space: pre-line">{{message}}</div>
   żeby zachować podział wiadomości na linie.
   ===================================================================== */
window.EMAILJS_CONFIG = {
  PUBLIC_KEY:            'k0piSbwbyOpDHlZme',
  SERVICE_ID:            'service_matrycapiekna',
  TEMPLATE_ID:           'template_ay1y2cc',
  AUTOREPLY_TEMPLATE_ID: 'template_hwr0vfo',
  DEBUG: false
};