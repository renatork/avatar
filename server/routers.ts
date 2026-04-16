import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage } from "./profileImageGenerator";
import { createGeneratedProfile, deleteProfile, getAllProfiles } from "./db";
import fs from "fs/promises"; // Adicionado para lidar com arquivos
import path from "path"; // Adicionado para lidar com caminhos

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
          // 1. Aponta para o logo dentro da pasta public gerada no build
          const logoPath = path.join(process.cwd(), "dist", "client", "logo.png");

          // Gerar imagem
          const imageBuffer = await generateProfileImage(
            input.name,
            input.team,
            logoPath
          );

          // 2. Definir onde salvar localmente na Hostinger
          const fileName = `${Date.now()}-${input.name.replace(/\s+/g, "-")}.jpg`;
          const uploadDir = path.join(process.cwd(), "dist", "client", "uploads");

          // Criar a pasta uploads se ela não existir
          await fs.mkdir(uploadDir, { recursive: true });

          // Salvar o arquivo de imagem fisicamente
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, imageBuffer);

          // 3. Criar a URL pública para acessar a imagem gerada
          const url = `/uploads/${fileName}`;

          // Salvar no banco de dados
          await createGeneratedProfile(0, input.name, input.team, url, filePath);

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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar histórico de perfis",
        });
      }
    }),

    delete: publicProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await deleteProfile(input.profileId, 0);
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
