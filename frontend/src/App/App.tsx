import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import DocumentTitle from 'react-document-title';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom';
import PageConnector from 'Components/Page/PageConnector';
import ApplyTheme from './ApplyTheme';
import { appRouteElements } from './AppRoutes';
import { queryClient } from './queryClient';

// React Router 7 with a data router, as Sonarr b4b415731 (#8614). The URL base is
// the basename, so routes and links use paths without it.

function PageLayout() {
  return (
    <>
      <ApplyTheme />
      <PageConnector>
        <Outlet />
      </PageConnector>
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<PageLayout />}>{appRouteElements()}</Route>
  ),
  { basename: window.Readarr.urlBase || undefined }
);

function App() {
  return (
    <DocumentTitle title={window.Readarr.instanceName}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </DocumentTitle>
  );
}

export default App;
