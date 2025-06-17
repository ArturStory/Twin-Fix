import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

// Icons
import { Send, Loader2 } from 'lucide-react';

// Schema for comment form
const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long (max 500 characters)'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    username: string;
  };
  // Additional fields that might come from the API
  userId?: number;
  username?: string;
  issueId?: number;
}

interface IssueCommentsListProps {
  issueId: number;
}

export default function IssueCommentsList({ issueId }: IssueCommentsListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Fetch comments
  const { 
    data: comments = [], // Provide empty array default
    isLoading, 
    isError 
  } = useQuery<Comment[]>({ 
    queryKey: ['/api/issues', issueId, 'comments'],
    // Handle errors in the query
    retry: 1,
    staleTime: 60000,
    select: (data) => {
      // Filter out any data that doesn't look like a comment
      console.log('Raw comments data:', data);
      if (!Array.isArray(data)) return [];
      return data.filter(item => 
        // Check if it looks like a comment object
        typeof item === 'object' && 
        item !== null && 
        'content' in item && 
        typeof item.content === 'string'
      );
    }
  });

  // Form handling
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: data.content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      form.reset();
      
      // Invalidate comments query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/issues', issueId, 'comments'] });
      
      // Show success toast
      toast({
        title: t('comments.added'),
        description: t('comments.addedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('comments.addFailed'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CommentFormValues) => {
    addCommentMutation.mutate(data);
  };

  if (isLoading) {
    return <CommentsListSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        {t('comments.loadError')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Komentarze dotyczące naprawy</h3>
        <Badge variant="outline" className="px-2 py-1">
          {Array.isArray(comments) ? comments.length : 0} komentarzy
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
            Brak komentarzy do tej naprawy. Dodaj pierwszy!
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Add comment form */}
      <div className="pt-4">
        <div className="bg-muted/10 p-4 rounded-lg border border-muted/30">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Send className="h-4 w-4 mr-2 text-primary" />
            Dodaj komentarz do naprawy
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Podziel się informacjami o tej naprawie, takimi jak dodatkowe uszkodzenia, 
            sugestie napraw lub potrzebne części.
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
                        placeholder="Type your comment about this machine repair..."
                        className="min-h-[100px] resize-none focus:border-primary"
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
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Post Comment
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

// Individual comment item
function CommentItem({ comment }: { comment: Comment }) {
  // Handle possible invalid date
  let commentDate: Date;
  try {
    commentDate = new Date(comment.createdAt);
    // Check if date is valid
    if (isNaN(commentDate.getTime())) {
      commentDate = new Date(); // Fallback to current date if invalid
    }
  } catch (e) {
    console.error('Invalid date format in comment:', comment.createdAt);
    commentDate = new Date(); // Fallback to current date
  }
  
  // Determine username from available fields
  let username = 'Unknown';
  let userId = 0;
  
  if (comment.user && comment.user.username) {
    username = comment.user.username;
    userId = comment.user.id;
  } else if (comment.username) {
    username = comment.username;
    userId = comment.userId || 0;
  }
  
  // Replace "Demo User" with "Artur" for user ID 3
  if ((username === 'Demo User' && userId === 3) || (username === 'artur')) {
    username = 'Artur';
  }
  
  // Debug log comment data
  console.log('Raw comment data:', comment);
  
  return (
    <div className="flex space-x-4 p-3 mb-2 rounded-md hover:bg-muted/50 transition-colors border border-muted/20">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary font-bold">
          {username === 'Artur' ? 'A' : (username ? username.charAt(0).toUpperCase() : 'U')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{username}</div>
          <div className="text-xs text-muted-foreground">
            {format(commentDate, 'PPp')}
          </div>
        </div>
        <div className="text-sm whitespace-pre-line bg-muted/10 p-2 rounded-md">
          {comment.content || "No comment content available"}
        </div>
      </div>
    </div>
  );
}

// Skeleton loading state
function CommentsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
      
      <Separator />
      
      <div className="pt-4 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}