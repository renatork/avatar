import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage } from "./profileImageGenerator";
import fs from "fs/promises";
import path from "path";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profiles: router({
    generate: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          team: z.string().min(1, "Equipe é obrigatória"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Aponta para o logo
          const logoPath = path.join(process.cwd(), "dist", "client", "logo.png");

          // Gerar imagem
          const imageBuffer = await generateProfileImage(
            input.name,
            input.team,
            logoPath
          );

          // Salvar fisicamente no servidor
          const fileName = `${Date.now()}-${input.name.replace(/\s+/g, "-")}.jpg`;
          const uploadDir = path.join(process.cwd(), "dist", "client", "uploads");

          await fs.mkdir(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, imageBuffer);

          const url = `/uploads/${fileName}`;

          return {
            success: true,
            url,
            name: input.name,
            team: input.team,
          };
        } catch (error) {
          console.error("Error generating profile:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao gerar imagem de perfil",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
