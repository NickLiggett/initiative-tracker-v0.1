import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { MoveToInbox as InboxIcon, Mail as MailIcon, Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import { Pages } from "../../constants/pages";
import { useSettings } from "../../settings/SettingsContext";

/**
 * The drawer of pages. A star on a page pins it to the top, under Favorites; pinned pages are also kept in the full
 * list below, so the list is always the same. The pins are kept on the user's account.
 */
export default function MainDrawer({drawerOpen, toggleDrawer, currentPage, setCurrentPage}) {
  const { settings, update } = useSettings();
  const favorites = settings.favoritePages;
  const isFavorite = (pageName) => favorites.includes(pageName);
  const toggleFavorite = (pageName) =>
    update({ favoritePages: isFavorite(pageName) ? favorites.filter((name) => name !== pageName) : [...favorites, pageName] });

  const entry = (pageName, index, group) => (
    <ListItem
      key={`${group}-${pageName}`}
      disablePadding
      secondaryAction={
        <IconButton
          edge="end"
          size="small"
          aria-label={isFavorite(pageName) ? `Unpin ${pageName} from favorites` : `Pin ${pageName} to favorites`}
          onClick={(event) => {
            event.stopPropagation(); // pinning is not choosing the page, and the drawer stays open
            toggleFavorite(pageName);
          }}
        >
          {isFavorite(pageName) ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
        </IconButton>
      }
    >
      <ListItemButton selected={pageName === currentPage} onClick={() => setCurrentPage(pageName)}>
        <ListItemIcon>
          {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
        </ListItemIcon>
        <ListItemText primary={pageName} />
      </ListItemButton>
    </ListItem>
  );

  const pages = Object.values(Pages);
  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      {favorites.length > 0 && (
        <>
          <List subheader={<ListSubheader component="div">Favorites</ListSubheader>} aria-label="Favorites">
            {favorites.map((pageName) => entry(pageName, pages.indexOf(pageName), "favorite"))}
          </List>
          <Divider />
        </>
      )}
      <List aria-label="All pages">
        {pages.map((pageName, index) => entry(pageName, index, "page"))}
      </List>
      <Divider />
    </Box>
  );

  return (
    <div>
      <Drawer open={drawerOpen} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}
