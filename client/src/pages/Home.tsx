import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Share2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const TEAM_OPTIONS = [
  "Comercial | Crédito",
  "Crédito",
  "Crédito | Comercial",
  "Comercial | Repasse",
  "Comercial | Assinatura",
  "Repasse",
  "Repasse | Assinatura",
  "Gestão | Assinatura", //Thays
  "Gestão | Comercial e Crédito", //Flavia
  "Gestão | Geral", //Juliana
  "Gestão | Repasse", //Leticia 
  "Gestão | Repasse e Crédito", //Carol
];

export default function Home() {
  const [nome, setNome] = useState("");
  const [equipe, setEquipe] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNome, setPreviewNome] = useState<string>("");

  const generateMutation = trpc.profiles.generate.useMutation();

  // Função de download (movida para cima para ser acessada na geração)
  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/\s+/g, "-")}-perfil.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    if (!nome.trim() || !equipe) {
      toast.error("Por favor, preencha nome e equipe");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        name: nome,
        team: equipe,
      });

      // Atualiza o preview na tela
      setPreviewUrl(result.url); 
      setPreviewNome(result.name);
      toast.success("Perfil gerado e baixado com sucesso!");
      
      // Aciona o download automaticamente
      handleDownload(result.url, result.name);

      // Limpa os campos
      setNome("");
      setEquipe("");
    } catch (error) {
      toast.error("Erro ao gerar perfil");
      console.error(error);
    }
  };

  const handleShare = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${name.replace(/\s+/g, "-")}-perfil.jpg`, { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Meu Perfil',
          text: 'Confira minha nova foto de perfil!',
        });
      } else {
        toast.info("O compartilhamento direto não é suportado no seu navegador. Por favor, clique em Baixar.");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerador de Perfil Beta</h1>
          <p className="text-gray-600">
            Crie sua foto de perfil personalizada com a identidade visual da empresa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulário */}
          <div>
            <Card className="h-full border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Criar Perfil</CardTitle>
                <CardDescription>Preencha os dados abaixo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome (ex: Ana Beatriz)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={generateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipe">Equipe</Label>
                  <Select value={equipe} onValueChange={setEquipe} disabled={generateMutation.isPending}>
                    <SelectTrigger id="equipe">
                      <SelectValue placeholder="Selecione sua equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_OPTIONS.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !nome.trim() || !equipe}
                  className="w-full bg-[#115FB4] hover:bg-blue-700 h-12 text-md mt-4"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Gerando Imagem...
                    </>
                  ) : (
                    "Gerar Perfil"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card className="h-full border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
                <CardDescription>Sua imagem pronta para uso</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-[calc(100%-5rem)]">
                {previewUrl ? (
                  <div className="flex flex-col h-full justify-between space-y-6">
                    <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                      <img
                        src={previewUrl}
                        alt="Preview do Perfil"
                        className="w-64 h-64 object-cover rounded shadow-md"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDownload(previewUrl, previewNome)}
                        className="flex-1 bg-[#115FB4] hover:bg-blue-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                      <Button
                        onClick={() => handleShare(previewUrl, previewNome)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-gray-50 rounded-lg h-full min-h-[250px] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 text-center px-6">
                      Preencha os dados e clique em gerar para visualizar a imagem aqui.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}