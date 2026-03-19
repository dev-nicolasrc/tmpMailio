const faqs = {
  es: [
    {
      q: "¿Qué es un correo temporal?",
      a: "Un correo temporal o desechable es una dirección de email que se genera automáticamente, funciona durante un tiempo limitado y se elimina sola. No requiere registro ni contraseña. TmpMail genera una dirección en segundos que expira tras 10 minutos de inactividad.",
    },
    {
      q: "¿Cuánto tiempo dura mi correo temporal?",
      a: "Tu dirección temporal dura 10 minutos por defecto. Cada vez que recibes un nuevo correo, el temporizador se reinicia añadiendo tiempo adicional. Mientras uses activamente el buzón, la dirección permanece activa.",
    },
    {
      q: "¿Son seguros los correos temporales?",
      a: "TmpMail no almacena tu dirección IP ni datos personales. Todos los mensajes se eliminan automáticamente al expirar. Sin embargo, cualquier persona que conozca tu dirección temporal puede ver tus correos, por lo que no debes usarla para información sensible o confidencial.",
    },
    {
      q: "¿Puedo recibir archivos adjuntos?",
      a: "Sí, puedes recibir archivos adjuntos mientras el buzón esté activo. Los adjuntos están disponibles para descarga durante el tiempo de vida del correo temporal.",
    },
    {
      q: "¿Puedo enviar correos con TmpMail?",
      a: "No. TmpMail es un servicio de recepción únicamente. La dirección temporal está diseñada para recibir correos de verificación y evitar el spam, no para enviar mensajes.",
    },
    {
      q: "¿Para qué se usa un correo desechable?",
      a: "Los correos temporales son ideales para registrarte en servicios que no conoces, verificar cuentas sin exponer tu email real, probar aplicaciones durante el desarrollo, o evitar newsletters y spam en tu bandeja de entrada principal.",
    },
  ],
  en: [
    {
      q: "What is a temporary email?",
      a: "A temporary or disposable email is an address that is generated automatically, works for a limited time, and deletes itself. No registration or password required. TmpMail generates an address in seconds that expires after 10 minutes of inactivity.",
    },
    {
      q: "How long does my temporary email last?",
      a: "Your temporary address lasts 10 minutes by default. Each time you receive a new email, the timer resets adding more time. While you actively use the mailbox, the address stays active.",
    },
    {
      q: "Are temporary emails safe?",
      a: "TmpMail does not store your IP address or personal data. All messages are automatically deleted when the mailbox expires. However, anyone who knows your temporary address can view your emails, so do not use it for sensitive or confidential information.",
    },
    {
      q: "Can I receive attachments?",
      a: "Yes, you can receive attachments while the mailbox is active. Attachments are available for download during the lifetime of the temporary email.",
    },
    {
      q: "Can I send emails with TmpMail?",
      a: "No. TmpMail is a receive-only service. The temporary address is designed to receive verification emails and avoid spam, not to send messages.",
    },
    {
      q: "What is a disposable email used for?",
      a: "Temporary emails are ideal for signing up to services you don't know, verifying accounts without exposing your real email, testing applications during development, or avoiding newsletters and spam in your main inbox.",
    },
  ],
}

export function buildFaqSchema(locale: "es" | "en") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs[locale].map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }
}
