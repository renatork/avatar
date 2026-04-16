import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Trash2, MessageCircle, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const TEAM_OPTIONS = [
  "Comercial",
  "Crédito",
  "Repasse",
  "Assinatura",
  "Comercial | Crédito",
  "Comercial | Repasse",
  "Comercial | Assinatura",
  "Comercial | Crédito - RJ",
  "Repasse | Assinatura",
  "Gestão | Comercial",
  "Gestão | Crédito",
  "Gestão | Repasse",
  "Gestão | Assinatura",
  "Gestão | Geral",
  "Gestão | Comercial e Crédito",
];

export default function Home() {
  const [nome, setNome] = useState("");
  const [equipe, setEquipe] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNome, setPreviewNome] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const generateMutation = trpc.profiles.generate.useMutation();
  const listQuery = trpc.profiles.list.useQuery();
  const deleteMutation = trpc.profiles.delete.useMutation();

  // Filtrar perfis baseado na pesquisa
  const filteredProfiles = useMemo(() => {
    if (!listQuery.data) return [];
    
    const query = searchQuery.toLowerCase();
    return listQuery.data.filter(
      (profile) =>
        profile.name.toLowerCase().includes(query) ||
        profile.team.toLowerCase().includes(query)
    );
  }, [listQuery.data, searchQuery]);

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

      setPreviewUrl(result.url);
      setPreviewNome(result.name);
      toast.success("Perfil gerado com sucesso!");
      setNome("");
      setEquipe("");

      // Recarregar histórico
      listQuery.refetch();
    } catch (error) {
      toast.error("Erro ao gerar perfil");
      console.error(error);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-perfil.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (profileId: number) => {
    try {
      await deleteMutation.mutateAsync({ profileId });
      toast.success("Perfil deletado com sucesso!");
      listQuery.refetch();
    } catch (error) {
      toast.error("Erro ao deletar perfil");
      console.error(error);
    }
  };

  const handleShareWhatsApp = (url: string, name: string) => {
    if (!url) {
      toast.error("Nenhuma imagem para compartilhar");
      return;
    }

    try {
      const text = encodeURIComponent(`Confira meu perfil na Brancomini: ${name}`);
      const whatsappUrl = `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`;
      
      const whatsappWindow = window.open(whatsappUrl, "_blank", "width=600,height=600");
      
      if (!whatsappWindow) {
        toast.error("Nao foi possivel abrir o WhatsApp. Verifique se o aplicativo esta instalado.");
      } else {
        toast.success("Abrindo WhatsApp...");
      }
    } catch (error) {
      console.error("Erro ao compartilhar no WhatsApp:", error);
      toast.error("Erro ao compartilhar no WhatsApp");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerador de Perfil Beta</h1>
          <p className="text-gray-600">
            Crie sua foto de perfil personalizada com a identidade visual Brancomini.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Criar Perfil</CardTitle>
                <CardDescription>Preencha os dados abaixo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
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
                  className="w-full bg-[#115FB4] hover:bg-blue-700"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Perfil"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="md:col-span-2">
            {previewUrl ? (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Sua imagem de perfil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-64 h-64 object-cover rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(previewUrl, previewNome)}
                      className="flex-1 bg-[#115FB4] hover:bg-blue-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                    <Button
                      onClick={() => handleShareWhatsApp(previewUrl, previewNome)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Sua imagem aparecerá aqui</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center bg-gray-100 rounded-lg p-16">
                    <p className="text-gray-500">Nenhuma imagem gerada ainda</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Histórico com Pesquisa */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Perfis</CardTitle>
              <CardDescription>Seus perfis gerados anteriormente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de Pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por nome ou equipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de Perfis */}
              {listQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#115FB4]" />
                </div>
              ) : filteredProfiles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="group relative">
                      <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square">
                        <img
                          src={profile.imageUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(profile.imageUrl, profile.name)}
                          className="text-white hover:bg-white/20"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShareWhatsApp(profile.imageUrl, profile.name)}
                          className="text-white hover:bg-green-500/20"
                          title="Compartilhar no WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(profile.id)}
                          className="text-white hover:bg-red-500/20"
                          disabled={deleteMutation.isPending}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-900 truncate">
                        {profile.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{profile.team}</p>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum perfil encontrado com "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum perfil gerado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
