import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage } from "./profileImageGenerator";
import { createGeneratedProfile, deleteProfile, getAllProfiles } from "./db";
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
          // 1. Aponta para o logo
          const logoPath = path.join(process.cwd(), "dist", "client", "logo.png");

          // 2. Gerar imagem
          const imageBuffer = await generateProfileImage(
            input.name,
            input.team,
            logoPath
          );

          // 3. Salvar fisicamente no servidor
          const fileName = `${Date.now()}-${input.name.replace(/\s+/g, "-")}.jpg`;
          const uploadDir = path.join(process.cwd(), "dist", "client", "uploads");

          await fs.mkdir(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, imageBuffer);

          const url = `/uploads/${fileName}`;

          // 4. Tentar salvar no banco (Se falhar, não trava a geração)
          try {
            await createGeneratedProfile(1, input.name, input.team, url, filePath);
          } catch (dbError) {
            console.warn("Aviso: Imagem salva fisicamente, mas falhou ao gravar no banco.", dbError);
          }

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

    list: publicProcedure.query(async () => {
      try {
        return await getAllProfiles();
      } catch (error) {
        // Se o banco falhar, retorna uma lista vazia em vez de travar o site
        console.warn("Banco de dados não disponível. Retornando histórico vazio.");
        return [];
      }
    }),

    delete: publicProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await deleteProfile(input.profileId, 1);
          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao deletar perfil",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
