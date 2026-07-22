import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminLayout from "@/pages/admin/layout";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCategories from "@/pages/admin/categories";
import AdminProducts from "@/pages/admin/products";
import AdminSettings from "@/pages/admin/settings";
import AdminImport from "@/pages/admin/import-page";
import AdminLogin from "@/pages/admin/login";
import { MenuProvider } from "@/contexts/menu-context";
import HomePage from "@/pages/menu/home-page";
import CategoriesPage from "@/pages/menu/categories-page";
import CategoryDetailPage from "@/pages/menu/category-detail-page";
import ProductDetailPage from "@/pages/menu/product-detail-page";
import LanguagePage from "@/pages/menu/language-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />

      <Route path="/admin/categories">
        {() => (
          <AdminLayout>
            <AdminCategories />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/products">
        {() => (
          <AdminLayout>
            <AdminProducts />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/settings">
        {() => (
          <AdminLayout>
            <AdminSettings />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/import">
        {() => (
          <AdminLayout>
            <AdminImport />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin">
        {() => (
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        )}
      </Route>

      {/* Menu routes — flat, no nesting to avoid wouter v3 splat issues */}
      <Route path="/categories/:categorySlug/:productSlug" component={ProductDetailPage} />
      <Route path="/categories/:categorySlug" component={CategoryDetailPage} />
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/language" component={LanguagePage} />
      <Route path="/" component={HomePage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MenuProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </MenuProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
