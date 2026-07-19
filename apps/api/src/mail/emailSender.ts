import nodemailer from "nodemailer";

import type { ApiEnv } from "../config/env.js";

export type PasswordResetEmail = {
  code: string;
  to: string;
};

export type EmailSender = {
  sendPasswordResetCode(input: PasswordResetEmail): Promise<void>;
};

export function createEmailSender(env: ApiEnv): EmailSender {
  if (!env.smtp) {
    return createNoopEmailSender();
  }

  const smtp = env.smtp;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    ...(smtp.user && smtp.pass
      ? {
          auth: {
            pass: smtp.pass,
            user: smtp.user,
          },
        }
      : {}),
  });

  return {
    async sendPasswordResetCode(input) {
      await transporter.sendMail({
        from: smtp.from,
        subject: "Codigo de recuperacao JO.IA",
        text: [
          "Use este codigo para recuperar sua senha no JO.IA.",
          "",
          `Codigo: ${input.code}`,
          "",
          "Se voce nao solicitou a recuperacao, ignore esta mensagem.",
        ].join("\n"),
        to: input.to,
      });
    },
  };
}

export function createNoopEmailSender(): EmailSender {
  return {
    async sendPasswordResetCode() {
      // Intentionally empty for local/test environments without SMTP.
    },
  };
}
