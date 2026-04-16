import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage } from "./profileImageGenerator";
import { storagePut } from "./storage";
import { createGeneratedProfile, deleteProfile, getAllProfiles } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
          // Gerar imagem
          const imageBuffer = await generateProfileImage(
            input.name,
            input.team,
            "/home/ubuntu/upload/LogoBBrancomini.png"
          );

          // Upload para S3 (sem userId, usar timestamp como identificador único)
          const fileKey = `profiles/public/${Date.now()}-${input.name.replace(/\s+/g, "-")}.jpg`;
          const { url } = await storagePut(fileKey, imageBuffer, "image/jpeg");

          // Salvar no banco de dados (userId = 0 para perfis públicos)
          await createGeneratedProfile(
            0,
            input.name,
            input.team,
            url,
            fileKey
          );

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
        // Retornar todos os perfis públicos (userId = 0)
        const profiles = await getAllProfiles();
        return profiles;
      } catch (error) {
        console.error("Error fetching profiles:", error);
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
          // Permitir deleção de qualquer perfil público
          await deleteProfile(input.profileId, 0);
          return { success: true };
        } catch (error) {
          console.error("Error deleting profile:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao deletar perfil",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
