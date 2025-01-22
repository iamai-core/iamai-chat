import { render, screen } from '@testing-library/react';
import SideBar from './SideBar';

test('renders learn react link', () => {
render(<SideBar />);
const linkElement = screen.getByText(/learn react/i);
expect(linkElement).toBeInTheDocument();
});