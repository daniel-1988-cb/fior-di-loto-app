export function EmptyTableRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center text-xs text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}
