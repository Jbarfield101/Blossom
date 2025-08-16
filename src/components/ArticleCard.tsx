import { Box, Typography, Link } from "@mui/material";

export interface Article {
  title: string;
  link: string;
  pub_date?: string;
  source: string;
  summary?: string;
}

interface Props {
  article: Article;
}

export default function ArticleCard({ article }: Props) {
  return (
    <Box
      component="article"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        variant="h6"
        component="h2"
        fontWeight={600}
        sx={{
          mb: 0.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {article.title}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontSize: 12, opacity: 0.7, mb: 1 }}
      >
        {article.source}
        {article.pub_date
          ? ` \u2022 ${new Date(article.pub_date).toLocaleString()}`
          : ""}
      </Typography>
      {article.summary && (
        <Typography
          variant="body2"
          sx={{
            fontSize: 14,
            mb: 1,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.summary}
        </Typography>
      )}
      <Link
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ fontSize: 14, fontWeight: "bold" }}
      >
        Read more
      </Link>
    </Box>
  );
}

