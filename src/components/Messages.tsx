import React, { useState, useEffect, useCallback } from 'react';
import { Social } from '@builddao/near-social-js';
import ReactMarkdown from 'react-markdown';
import { fetchTimeByBlockHeight } from '@/utils/timeFormat';
import styles from '../styles/Messages.module.css';
import { useNearWallet } from '@/contexts/NearWalletContext';

const ACCOUNT_ID = 'warsofcards.near';
const BATCH_SIZE = '10';

// Storage and points system constants
const COMMENT_DEPOSIT_NEAR = 0.03; // NEAR per comment
const BYTES_PER_NEAR = 100000; // 1 NEAR = 100,000 bytes (0.00001 NEAR per byte)
const MAX_COMMENT_BYTES = Math.floor(COMMENT_DEPOSIT_NEAR * BYTES_PER_NEAR); // 3000 bytes
const BYTES_PER_CHAR = 1; // Approximate bytes per character
const MAX_COMMENT_LENGTH = Math.floor(MAX_COMMENT_BYTES / BYTES_PER_CHAR); // Maximum characters allowed

interface Comment {
  id: string;
  accountId: string;
  content: string;
  timestamp: string;
  blockHeight: number;
}

interface Post {
  id: string;
  accountId: string;
  content: string;
  blockHeight: number;
  imageIPFSHash: string | null;
  timestamp: string;
  comments: Comment[];
  likes: string[];  // Array of account IDs who liked the post
}

interface IndexItem {
  blockHeight: string;
  action: string;
  key: string;
  accountId: string;
}

interface CommentIndexItem {
  accountId: string;
  blockHeight: string;
  value: {
    type: string;
    blockHeight: string;
    [key: string]: any;
  }
}

interface SocialData {
  [key: string]: {
    post?: {
      main: string;
      comment?: string;
    };
    index?: {
      like?: string;
    };
  };
}

interface BlockChunk {
  transactions?: Array<{
    receiver_id: string;
    signer_id: string;
  }>;
}

interface BlockData {
  result?: {
    chunks?: BlockChunk[];
  };
}

interface CommentIndexData {
  data?: Array<{
    accountId: string;
    blockHeight: string;
    [key: string]: any;
  }>;
}

interface CommentProps {
  comment: Comment;
  key?: string;
}

interface CommentFormProps {
  postBlockHeight: number;
  onCommentSubmitted?: () => void;
}

interface FormEvent {
  preventDefault: () => void;
}

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.loadingSpinner}></div>
    <p className={styles.loadingText}>Loading messages...</p>
  </div>
);

const IPFSImage = ({ hash }: { hash: string }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <div className={styles.imageError}>Failed to load image</div>;
  }

  return (
    <div className={styles.imageContainer}>
      <img 
        src={`https://ipfs.near.social/ipfs/${hash}`}
        alt="Post image"
        className={styles.postImage}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
};

const Comment = ({ comment }: CommentProps): JSX.Element => (
  <div className={styles.comment}>
    <div className={styles.commentHeader}>
      <div className={styles.commentAuthor}>
        <img 
          src={`https://i.near.social/magic/thumbnail/https://near.social/magic/img/account/${comment.accountId}`}
          alt={comment.accountId}
          className={styles.authorAvatar}
        />
        <span className={styles.commentAuthorName}>{comment.accountId}</span>
      </div>
    </div>
    <div className={styles.commentContent}>
      <ReactMarkdown>{comment.content}</ReactMarkdown>
    </div>
  </div>
);

const CommentForm = ({ postBlockHeight, onCommentSubmitted }: CommentFormProps) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wallet = useNearWallet();

  const isOverLimit = comment.length > MAX_COMMENT_LENGTH;

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet.accountId || !comment.trim() || isSubmitting || isOverLimit) return;

    setIsSubmitting(true);
    try {
      const data = {
        [wallet.accountId]: {
          post: {
            comment: JSON.stringify({
              item: {
                type: "social",
                path: `${ACCOUNT_ID}/post/main`,
                blockHeight: postBlockHeight
              },
              type: "md",
              text: comment.trim()
            })
          },
          index: {
            comment: JSON.stringify({
              key: {
                type: "social",
                path: `${ACCOUNT_ID}/post/main`,
                blockHeight: postBlockHeight
              },
              value: {
                type: "md"
              }
            }),
            notify: JSON.stringify({
              key: ACCOUNT_ID,
              value: {
                type: "comment",
                item: {
                  type: "social",
                  path: `${ACCOUNT_ID}/post/main`,
                  blockHeight: postBlockHeight
                }
              }
            })
          }
        }
      };

      await wallet.executeTransaction({
        contractId: 'social.near',
        methodName: 'set',
        args: { data },
        gas: '300000000000000',
        deposit: '30000000000000000000000'
      });

      setComment('');
      if (onCommentSubmitted) {
        // Wait 500ms before starting refresh sequence
        setTimeout(() => {
          // First refresh after 500ms
          onCommentSubmitted();
          
          // Second refresh after 2.5 seconds
          setTimeout(() => {
            onCommentSubmitted();
          }, 2000);
          
          // Third refresh after 4.5 seconds
          setTimeout(() => {
            onCommentSubmitted();
          }, 4000);
        }, 500);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [wallet, comment, isSubmitting, postBlockHeight, onCommentSubmitted, isOverLimit]);

  if (!wallet.accountId) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.commentForm}>
      <textarea
        value={comment}
        onChange={(e: { target: { value: string } }) => setComment(e.target.value)}
        placeholder="Write your message here..."
        className={`${styles.commentInput} ${isOverLimit ? styles.inputError : ''}`}
        disabled={isSubmitting}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <button 
        type="submit" 
        className={styles.commentSubmitButton}
        disabled={!comment.trim() || isSubmitting || isOverLimit}
      >
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
};

export function Messages() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<{[key: string]: boolean}>({});
  const wallet = useNearWallet();
  const socialClient = new Social({
    network: 'mainnet',
    nodeUrl: 'https://free.rpc.fastnear.com'
  } as any);

  const fetchLikes = async (blockHeight: string) => {
    try {
      console.log('Fetching likes for block', blockHeight);

      const result = await socialClient.get({
        keys: ['*/index/like']
      }) as SocialData;

      console.log('Likes result:', result);
      
      const likes: string[] = [];
      
      // Process each account that has likes
      for (const accountId in result) {
        const likeData = result[accountId]?.index?.like;
        if (!likeData) continue;
        
        try {
          // Parse like data
          const parsedLike = typeof likeData === 'string' 
            ? JSON.parse(likeData) 
            : likeData;
          
          // Check if like is related to our post
          if (parsedLike.key?.path === `${ACCOUNT_ID}/post/main` && 
              parsedLike.key.blockHeight == blockHeight) {
            console.log(`Found like from ${accountId}!`);
            likes.push(accountId);
          }
        } catch (e) {
          console.error(`Error processing like from ${accountId}:`, e);
        }
      }
      
      console.log(`Found ${likes.length} likes for post ${blockHeight}`);
      return likes;
    } catch (e) {
      console.error('Error in fetchLikes:', e);
      return [];
    }
  };

  const getTransactionsForBlock = async (blockHeight: string) => {
    try {
      const response = await fetch(`https://free.rpc.fastnear.com/block/${blockHeight}`);
      const blockData = await response.json() as BlockData;
      console.log('Block data for height', blockHeight, ':', blockData);
      
      return blockData.result?.chunks
        ?.flatMap(chunk => chunk.transactions || [])
        .filter(tx => tx?.receiver_id === ACCOUNT_ID || tx?.signer_id === ACCOUNT_ID) || [];
    } catch (error) {
      console.error('Error fetching block transactions:', error);
      return [];
    }
  };

  const fetchComments = async (blockHeight: string) => {
    try {
      console.log('Fetching comments for block', blockHeight);

      const result = await socialClient.get({
        keys: ['*/post/comment']
      }) as SocialData;

      console.log('Comments result:', result);
      
      const comments: Comment[] = [];
      let commentCount = 0;
      const MAX_COMMENTS_PER_POST = 50;
      
      // Przetwarzamy każde konto, które ma komentarze
      commentLoop: for (const accountId in result) {
        // Jeśli osiągnęliśmy limit komentarzy, przerywamy pętlę
        if (commentCount >= MAX_COMMENTS_PER_POST) {
          console.log(`Reached maximum comment limit (${MAX_COMMENTS_PER_POST}) for post ${blockHeight}`);
          break commentLoop;
        }

        const commentData = result[accountId]?.post?.comment;
        if (!commentData) continue;
        
        try {
          // Parsujemy dane komentarza
          const parsedComment = typeof commentData === 'string' 
            ? JSON.parse(commentData) 
            : commentData;
          
          // Szybkie sprawdzenie czy komentarz jest powiązany z naszym postem
          if (!parsedComment?.item?.path?.includes(ACCOUNT_ID) || 
              parsedComment.item.blockHeight != blockHeight) {
            continue; // Pomijamy niepowiązane komentarze
          }
          
          // Dokładniejsze sprawdzenie dla pasujących komentarzy
          if (parsedComment.item.path === `${ACCOUNT_ID}/post/main`) {
            console.log(`Found relevant comment from ${accountId}!`);
            
            let timestamp: string;
            try {
              timestamp = await fetchTimeByBlockHeight(parseInt(parsedComment.item.blockHeight));
            } catch (e) {
              timestamp = new Date().toLocaleDateString();
            }
            
            comments.push({
              id: `${accountId}-${Date.now()}`,
              accountId,
              content: parsedComment.text || '',
              timestamp,
              blockHeight: parseInt(blockHeight)
            });
            
            commentCount++;
          }
        } catch (e) {
          console.error(`Error processing comment from ${accountId}:`, e);
        }
      }
      
      console.log(`Found ${comments.length} comments for post ${blockHeight} (limited to ${MAX_COMMENTS_PER_POST})`);
      return comments;
    } catch (e) {
      console.error('Error in fetchComments:', e);
      return [];
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      setIsRefreshing(true);
      console.log('Fetching posts...');
      const indexResult = await socialClient.index({
        action: 'post',
        key: 'main',
        limit: BATCH_SIZE,
        accountId: ACCOUNT_ID,
        order: 'desc'
      });

      console.log('Posts index result:', indexResult);
      if (!indexResult?.length) {
        console.log('No posts found in index');
        setLoading(false);
        return;
      }

      const postsData = await Promise.all(
        (indexResult as unknown as IndexItem[]).map(async (item) => {
          try {
            const blockHeightStr = item.blockHeight;
            console.log('Fetching post data for block height:', blockHeightStr);
            
            const result = await socialClient.get({
              keys: [`${ACCOUNT_ID}/post/main`],
              blockHeight: blockHeightStr as unknown as bigint
            }) as SocialData;

            console.log('Post data result:', JSON.stringify(result));
            const postData = result?.[ACCOUNT_ID];
            if (!postData || typeof postData.post?.main !== 'string') {
              console.log('No post content found for block height:', blockHeightStr);
              return null;
            }

            const postContent = postData.post.main;
            const parsedContent = JSON.parse(postContent);
            console.log('Parsed post content:', parsedContent);
            const time = await fetchTimeByBlockHeight(parseInt(blockHeightStr));

            // Fetch comments and likes for this post
            const [comments, likes] = await Promise.all([
              fetchComments(blockHeightStr),
              fetchLikes(blockHeightStr)
            ]);
            
            console.log('Comments for post:', comments);
            console.log('Likes for post:', likes);

            return {
              id: `${blockHeightStr}-${Date.now()}`,
              accountId: ACCOUNT_ID,
              content: parsedContent.text || '',
              blockHeight: parseInt(blockHeightStr),
              imageIPFSHash: parsedContent.image?.ipfs_cid || null,
              timestamp: time,
              comments,
              likes
            };
          } catch (e) {
            console.error('Error processing post:', e);
            return null;
          }
        })
      );

      const filteredPosts = postsData.filter(Boolean) as Post[];
      console.log('Final posts with comments:', filteredPosts);
      
      if (filteredPosts.length > 0) {
        setPosts(filteredPosts.sort((a, b) => b.blockHeight - a.blockHeight));
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching posts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [socialClient]);

  // Fetch posts only once when component mounts
  useEffect(() => {
    fetchPosts();
  }, []); // Empty dependency array means it runs only once on mount

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  if (loading && posts.length === 0) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.messagesContainer}>
      <div className={styles.refreshContainer}>
        <div className={styles.pointsInfo}>
        ♣️ Messages & likes = points! Convert to NEAR in Profile 
        </div>
        <button 
          className={styles.refreshButton}
          onClick={() => fetchPosts()}
          disabled={isRefreshing}
        >
          {isRefreshing ? '♠️ Shuffling...' : '♠️ Shuffle'}
        </button>
      </div>
      <div className={styles.messagesList}>
        {posts.length === 0 ? (
          <p>No messages yet</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className={styles.post}>
              <div className={styles.postHeader}>
                <div className={styles.postAuthor}>
                  <img 
                    src={`https://i.near.social/magic/thumbnail/https://near.social/magic/img/account/${post.accountId}`}
                    alt={post.accountId}
                    className={styles.authorAvatar}
                  />
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>{post.accountId}</span>
                    <span className={styles.postTime}>{post.timestamp}</span>
                  </div>
                </div>
                <LikeButton post={post} onLikeSubmitted={fetchPosts} />
              </div>
              <div className={styles.postContent}>
                <div className={styles.postText}>
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
                {post.imageIPFSHash && (
                  <IPFSImage hash={post.imageIPFSHash} />
                )}
              </div>
              <div className={styles.commentsSection}>
                {wallet.accountId && (
                  <>
                    <h3 className={styles.communityMessagesTitle}>Send Message</h3>
                    <CommentForm 
                      postBlockHeight={post.blockHeight} 
                      onCommentSubmitted={fetchPosts}
                    />
                  </>
                )}
                <div className={styles.commentsHeader} onClick={() => toggleComments(post.id)}>
                  <h3 className={styles.communityMessagesTitle}>
                    Community Messages ({post.comments.length})
                  </h3>
                  <button 
                    className={`${styles.toggleButton} ${expandedComments[post.id] ? styles.expanded : ''}`}
                    aria-label={expandedComments[post.id] ? 'Collapse messages' : 'Expand messages'}
                  >
                    ♦️ {expandedComments[post.id] ? '' : ''}
                  </button>
                </div>
                <div className={`${styles.commentsList} ${expandedComments[post.id] ? styles.expanded : ''}`}>
                  {post.comments.length > 0 ? (
                    expandedComments[post.id] && post.comments.map(comment => (
                      <Comment key={comment.id} comment={comment} />
                    ))
                  ) : (
                    <p className={styles.noComments}>No messages yet</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const LikeButton = ({ post, onLikeSubmitted }: { post: Post; onLikeSubmitted?: () => void }) => {
  const wallet = useNearWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const hasLiked = wallet.accountId && post.likes.includes(wallet.accountId);

  const handleLike = useCallback(async () => {
    if (!wallet.accountId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = {
        [wallet.accountId]: {
          index: {
            like: JSON.stringify({
              key: {
                type: "social",
                path: `${ACCOUNT_ID}/post/main`,
                blockHeight: post.blockHeight
              },
              value: {
                type: "like"
              }
            }),
            notify: JSON.stringify({
              key: ACCOUNT_ID,
              value: {
                type: "like",
                item: {
                  type: "social",
                  path: `${ACCOUNT_ID}/post/main`,
                  blockHeight: post.blockHeight
                }
              }
            })
          }
        }
      };

      await wallet.executeTransaction({
        contractId: 'social.near',
        methodName: 'set',
        args: { data },
        gas: '300000000000000',
        deposit: '30000000000000000000000' // 0.03 NEAR
      });

      if (onLikeSubmitted) {
        // Wait 500ms before starting refresh sequence
        setTimeout(() => {
          // First refresh after 500ms
          onLikeSubmitted();
          
          // Second refresh after 2.5 seconds
          setTimeout(() => {
            onLikeSubmitted();
          }, 2000);
          
          // Third refresh after 4.5 seconds
          setTimeout(() => {
            onLikeSubmitted();
          }, 4000);
        }, 500);
      }
    } catch (error) {
      console.error('Error submitting like:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [wallet, post.blockHeight, isSubmitting, onLikeSubmitted]);

  return (
    <button 
      onClick={handleLike}
      disabled={isSubmitting || !wallet.accountId}
      className={`${styles.likeButton} ${hasLiked ? styles.liked : ''}`}
    >
      <span className={styles.likeIcon}>
        {hasLiked ? '❤️' : '🤍'}
      </span>
      <span className={styles.likeCount}>{post.likes.length}</span>
    </button>
  );
}; 