import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, MessageCircle, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '@/hooks/use-auth';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  issueId: number;
  username: string;
  user?: {
    id: number;
    username: string;
  };
}

interface IssueCommentsListProps {
  issueId: number;
}

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long')
});

function CommentItem({ comment }: { comment: Comment }) {
  const createdDate = new Date(comment.createdAt);
  
  return (
    <div className="flex gap-3 p-3 bg-card/50 rounded-lg border">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {comment.username?.charAt(0)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{comment.username || 'User'}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(createdDate, 'PPp')}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
}

export default function IssueCommentsListFixed({ issueId }: IssueCommentsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['/api/issues', issueId, 'comments'],
    queryFn: () => fetch(`/api/issues/${issueId}/comments`).then(res => res.json()),
  });

  const form = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: ''
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string }) => 
      fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: data.content,
          userId: user?.id,
          username: user?.username,
          issueId: issueId
        }),
        credentials: 'include'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/issues', issueId, 'comments'] });
      form.reset();
    }
  });

  const onSubmit = (data: { content: string }) => {
    addCommentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="text-center p-4">
        {i18n.language === 'es' ? 'Cargando comentarios...' : 
         i18n.language === 'pl' ? 'Ładowanie komentarzy...' : 
         'Loading comments...'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {i18n.language === 'es' ? 'Comentarios sobre la reparación' : 
           i18n.language === 'pl' ? 'Komentarze dotyczące naprawy' : 
           'Repair Comments'}
        </h3>
        <Badge variant="outline" className="px-2 py-1">
          {Array.isArray(comments) ? comments.length : 0} {
            i18n.language === 'es' ? 'comentarios' : 
            i18n.language === 'pl' ? 'komentarzy' : 
            'comments'
          }
        </Badge>
      </div>
      
      {/* Comments list */}
      <div className="space-y-2">
        {Array.isArray(comments) && comments.length > 0 ? (
          comments.map((comment: Comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center p-6 bg-muted/10 rounded-md text-muted-foreground">
            {i18n.language === 'es' ? 'No hay comentarios para esta reparación. ¡Agrega el primero!' : 
             i18n.language === 'pl' ? 'Brak komentarzy do tej naprawy. Dodaj pierwszy!' : 
             'No comments for this repair. Add the first one!'}
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Add comment form */}
      <div className="pt-4">
        <div className="bg-muted/10 p-4 rounded-lg border border-muted/30">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Send className="h-4 w-4 mr-2 text-primary" />
            {i18n.language === 'es' ? 'Agregar comentario sobre la reparación' : 
             i18n.language === 'pl' ? 'Dodaj komentarz do naprawy' : 
             'Add repair comment'}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            {i18n.language === 'es' ? 'Comparte información sobre esta reparación, como daños adicionales, sugerencias de reparación o partes necesarias.' : 
             i18n.language === 'pl' ? 'Podziel się informacjami o tej naprawie, takimi jak dodatkowe uszkodzenia, sugestie napraw lub potrzebne części.' : 
             'Share information about this repair, such as additional damage, repair suggestions, or needed parts.'}
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={
                          i18n.language === 'es' ? 'Escribe tu comentario sobre esta reparación...' : 
                          i18n.language === 'pl' ? 'Wpisz swój komentarz o tej naprawie...' : 
                          'Enter your comment about this repair...'
                        }
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={addCommentMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {addCommentMutation.isPending ? 
                    (i18n.language === 'es' ? 'Enviando...' : 
                     i18n.language === 'pl' ? 'Wysyłanie...' : 
                     'Sending...') : 
                    (i18n.language === 'es' ? 'Enviar comentario' : 
                     i18n.language === 'pl' ? 'Wyślij komentarz' : 
                     'Send comment')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}