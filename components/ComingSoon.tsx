import PageHeader from '@/components/PageHeader';

export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex-1 px-7 py-5">
        <div className="card flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <div className="font-display text-[15px] font-semibold text-heading">
            Đang phát triển
          </div>
          <p className="max-w-md text-[13px] text-ink-2">{note}</p>
        </div>
      </div>
    </>
  );
}
