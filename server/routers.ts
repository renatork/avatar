import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage } from "./profileImageGenerator";
import { storagePut } from "./storage";
import { createGeneratedProfile, deleteProfile, getUserProfiles } from "./db";

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
    generate: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          team: z.string().min(1, "Equipe é obrigatória"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        try {
          // Gerar imagem
          const imageBuffer = await generateProfileImage(
            input.name,
            input.team,
            "/home/ubuntu/upload/LogoBBrancomini.png"
          );

          // Upload para S3
          const fileKey = `profiles/${ctx.user.id}/${Date.now()}-${input.name.replace(/\s+/g, "-")}.jpg`;
          const { url } = await storagePut(fileKey, imageBuffer, "image/jpeg");

          // Salvar no banco de dados
          await createGeneratedProfile(
            ctx.user.id,
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

    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const profiles = await getUserProfiles(ctx.user.id);
        return profiles;
      } catch (error) {
        console.error("Error fetching profiles:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar histórico de perfis",
        });
      }
    }),

    delete: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        try {
          await deleteProfile(input.profileId, ctx.user.id);
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
